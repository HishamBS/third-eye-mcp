import { useCallback, useEffect, useRef } from 'react';
import { buildWebSocketUrl, fetchEvents } from '../lib/api';
import { usePipelineStore } from '../store/pipelineStore';
import type { PipelineEvent, EvidenceClaim } from '../types/pipeline';

const BACKOFF_STEPS = [0, 1000, 2000, 4000, 7000, 11000, 16000, 20000];

function parseClaims(payload: unknown): EvidenceClaim[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;

      // Support both formats:
      // - Tenseigan Eye format: { claim, startIndex, endIndex, hasEvidence, evidenceQuality, ... }
      // - UI format: { text, start, end, citation, confidence }
      const text = typeof candidate.text === 'string' ? candidate.text : (typeof candidate.claim === 'string' ? candidate.claim : null);
      if (!text) return null;

      // Map startIndex/endIndex to start/end
      const start = Number(candidate.start ?? candidate.startIndex ?? 0);
      const end = Number(candidate.end ?? candidate.endIndex ?? 0);

      // Map citation from evidence metadata
      let citation: string | null = null;
      if (typeof candidate.citation === 'string') {
        citation = candidate.citation;
      } else if (candidate.hasEvidence && candidate.evidenceType) {
        // Generate citation info from Tenseigan metadata
        citation = `${candidate.evidenceType} (${candidate.evidenceQuality})`;
      }

      // Map confidence - if evidenceQuality exists, convert to numeric score
      let confidence = Number(candidate.confidence ?? 0);
      if (!confidence && typeof candidate.evidenceQuality === 'string') {
        const qualityMap: Record<string, number> = {
          'strong': 0.9,
          'moderate': 0.7,
          'weak': 0.4,
          'missing': 0.1,
        };
        confidence = qualityMap[candidate.evidenceQuality] ?? 0;
      }

      return {
        text,
        start,
        end,
        citation,
        confidence,
      } satisfies EvidenceClaim;
    })
    .filter(Boolean) as EvidenceClaim[];
}

function normaliseEvent(raw: unknown): PipelineEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const event = raw as Record<string, unknown>;
  return {
    type: String(event.type || 'eye_update') as PipelineEvent['type'],
    session_id: String(event.session_id ?? ''),
    eye: typeof event.eye === 'string' ? event.eye : undefined,
    ok: typeof event.ok === 'boolean' ? (event.ok as boolean) : undefined,
    code: typeof event.code === 'string' ? event.code : undefined,
    tool_version: typeof event.tool_version === 'string' ? event.tool_version : undefined,
    md: typeof event.md === 'string' ? event.md : undefined,
    data: (event.data && typeof event.data === 'object' ? (event.data as Record<string, unknown>) : undefined) ?? {},
    ts: typeof event.ts === 'string' ? event.ts : undefined,
  };
}

export function usePipelineWS(options: {
  sessionId: string | null;
  apiKey: string | null;
  enable: boolean;
}) {
  const { sessionId, apiKey, enable } = options;
  const reset = usePipelineStore((state) => state.reset);
  const switchSession = usePipelineStore((state) => state.switchSession);
  const addEvent = usePipelineStore((state) => state.addEvent);
  const setEyeState = usePipelineStore((state) => state.setEyeState);
  const setSettings = usePipelineStore((state) => state.setSettings);
  const setClaims = usePipelineStore((state) => state.setClaims);
  const setConnectionState = usePipelineStore((state) => state.setConnectionState);
  const setError = usePipelineStore((state) => state.setError);
  const incrementAttempts = usePipelineStore((state) => state.incrementAttempts);
  const retryRef = useRef<number>(0);
  const socketRef = useRef<WebSocket | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeSessionRef = useRef<string | null>(null);

  const ensureSession = useCallback(
    (nextId: string | null | undefined) => {
      if (!nextId) return;
      if (activeSessionRef.current === nextId) return;
      switchSession(nextId);
      activeSessionRef.current = nextId;
    },
    [switchSession],
  );

  useEffect(() => {
    if (!sessionId || !apiKey || !enable) {
      reset();
      activeSessionRef.current = null;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    ensureSession(sessionId);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchEvents({ sessionId, apiKey, signal: controller.signal })
      .then((items) => {
        items.forEach((item) => {
          ensureSession(item.session_id ?? null);
          addEvent(item);
          if (item.type === 'eye_update') {
            setEyeState(item.eye ?? 'UNKNOWN', {
              eye: (item.eye ?? 'UNKNOWN').toUpperCase(),
              ok: item.ok ?? null,
              code: item.code ?? null,
              md: item.md ?? null,
              toolVersion: item.tool_version ?? null,
              data: item.data ?? {},
              ts: item.ts ?? null,
            });
          } else if (item.type === 'settings_update' && item.data) {
            setSettings(item.data as Record<string, unknown>);
          }
        });
      })
      .catch((error) => {
        console.warn('Failed to preload events', error);
        setError('Failed to load historical events');
      });

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const wsUrl = buildWebSocketUrl(sessionId, apiKey);
      const socket = new WebSocket(wsUrl);

      socketRef.current = socket;

      socket.onopen = () => {
        retryRef.current = 0;
        setConnectionState(true);
        setError(null);
      };

      socket.onclose = () => {
        setConnectionState(false);
        if (cancelled) return;
        retryRef.current += 1;
        incrementAttempts();
        const delay = BACKOFF_STEPS[Math.min(retryRef.current, BACKOFF_STEPS.length - 1)];
        setTimeout(connect, delay + Math.random() * 250);
      };

      socket.onerror = () => {
        setError('Realtime connection error');
        incrementAttempts();
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string);
          const envelope = normaliseEvent(parsed);
          if (!envelope) return;
          ensureSession(envelope.session_id ?? null);
          addEvent(envelope);
          switch (envelope.type) {
            case 'eye_update':
              setEyeState(envelope.eye ?? 'UNKNOWN', {
                eye: (envelope.eye ?? 'UNKNOWN').toUpperCase(),
                ok: envelope.ok ?? null,
                code: envelope.code ?? null,
                md: envelope.md ?? null,
                toolVersion: envelope.tool_version ?? null,
                data: envelope.data ?? {},
                ts: envelope.ts ?? null,
              });
              break;
            case 'settings_update':
              if (envelope.data) {
                setSettings(envelope.data as Record<string, unknown>);
              }
              break;
            case 'tenseigan_claims':
              if (envelope.data && Array.isArray((envelope.data as Record<string, unknown>).claims)) {
                const claims = parseClaims((envelope.data as Record<string, unknown>).claims);
                setClaims(claims);
              }
              break;
            default:
              break;
          }
        } catch (error) {
          console.error('Failed to process WS payload', error);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      socketRef.current?.close();
      socketRef.current = null;
      activeSessionRef.current = null;
    };
  }, [
    sessionId,
    apiKey,
    enable,
    reset,
    ensureSession,
    addEvent,
    setEyeState,
    setSettings,
    setClaims,
    setConnectionState,
    setError,
    incrementAttempts,
  ]);
}
