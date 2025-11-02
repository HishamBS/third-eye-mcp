'use client';

import { useState, useEffect } from 'react';
import { PipelineVisualization } from './monitor/PipelineVisualization';
import { useWebSocket, type WSMessage } from '@/hooks/useWebSocket';
import { API_BASE_URL } from '@/consts/api';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';

type NormalizedEvent = Record<string, unknown> & {
  id: string;
  type?: string;
  eye?: string;
  code?: string;
  md?: string;
  createdAt: number;
  dataJson?: Record<string, unknown>;
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function firstString(values: Array<unknown>): string | undefined {
  for (const value of values) {
    const str = getString(value);
    if (str) {
      return str;
    }
  }
  return undefined;
}

function normalizeApiPipelineEvent(event: Record<string, unknown>): NormalizedEvent {
  const id = getString(event.id) || `api-${Date.now()}`;
  const createdAtValue = event.createdAt;
  const createdAt = typeof createdAtValue === 'number'
    ? createdAtValue
    : typeof createdAtValue === 'string'
      ? Date.parse(createdAtValue)
      : Date.now();

  const dataJson = asRecord(event.dataJson);
  const result = asRecord(event.result);

  const code = getString(event.code)
    || (dataJson ? getString(dataJson.code) : undefined)
    || (result ? getString(result.code) : undefined);

  const md = firstString([
    event.md,
    dataJson?.md,
    result?.md,
    dataJson?.details,
    dataJson?.summary,
  ]);

  const eye = getString(event.eye)
    || (dataJson ? getString(dataJson.eye) : undefined)
    || (result ? getString(result.eye) : undefined);

  return {
    id,
    type: getString(event.type),
    eye,
    code,
    md,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    dataJson,
    raw: event,
  };
}

function normalizeWebSocketEvent(message: WSMessage): NormalizedEvent | null {
  const payload = asRecord(message.data);
  if (!payload) {
    return null;
  }

  const result = asRecord(payload.result);
  const ui = asRecord(payload.ui);
  const timestamp = typeof payload.timestamp === 'number' ? payload.timestamp : message.timestamp;

  const idParts = [
    getString(payload.runId),
    getString(payload.eventType) || message.type,
    getString(payload.status),
    getString(payload.eye),
    timestamp ? String(timestamp) : undefined,
  ].filter(Boolean);

  const id = idParts.length > 0
    ? `ws-${idParts.join(':')}`
    : `ws-${typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now())}`;

  const code = getString(payload.code)
    || (result ? getString(result.code) : undefined);

  const md = firstString([
    payload.md,
    result?.md,
    ui?.summary,
    ui?.details,
    payload.error,
  ]);

  const eye = getString(payload.eye)
    || (result ? getString(result.eye) : undefined);

  return {
    id,
    type: getString(payload.eventType) || message.type,
    eye,
    code,
    md,
    createdAt: timestamp,
    dataJson: payload,
    raw: payload,
  };
}

interface LivePipelineFlowProps {
  sessionId: string;
  initialEvents?: Array<Record<string, unknown>>;
}

export function LivePipelineFlow({ sessionId, initialEvents = [] }: LivePipelineFlowProps) {
  const [events, setEvents] = useState<NormalizedEvent[]>(() =>
    initialEvents.map((event) => normalizeApiPipelineEvent(event))
  );
  const [isConnected, setIsConnected] = useState(false);

  const { isConnected: wsConnected, lastMessage } = useWebSocket({ sessionId });

  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  useEffect(() => {
    if (initialEvents.length > 0) {
      const normalized = initialEvents.map((event) => normalizeApiPipelineEvent(event));
      normalized.sort((a, b) => a.createdAt - b.createdAt);
      setEvents(normalized);
    }
  }, [initialEvents]);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'pipeline_event' || lastMessage.type === 'eye_complete') {
        const normalized = normalizeWebSocketEvent(lastMessage);
        if (!normalized) {
          return;
        }

        setEvents((prev) => {
          const existingIndex = prev.findIndex((event) => event.id === normalized.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = normalized;
            return updated;
          }

          const next = [...prev, normalized];
          next.sort((a, b) => a.createdAt - b.createdAt);
          return next;
        });
      } else if (lastMessage.type === 'pipeline_complete') {
        console.log('Pipeline completed:', lastMessage);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    const fetchInitialEvents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/session/${sessionId}/events`);
        if (response.ok) {
          const data = await response.json();
          const payload = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.events)
              ? data.events
              : [];

          const normalized = payload.map((event: Record<string, unknown>) => normalizeApiPipelineEvent(event));
          normalized.sort((a, b) => a.createdAt - b.createdAt);
          setEvents(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch initial events:', err);
      }
    };

    if (initialEvents.length === 0) {
      fetchInitialEvents();
    }
  }, [sessionId, initialEvents]);

  return (
    <div className="relative">
      {/* Connection Status Badge */}
      <div className="absolute top-2 right-2 z-20">
        <div className={`flex items-center space-x-2 rounded-full px-3 py-1 text-xs font-medium ${
          isConnected
            ? `${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success} border ${STATUS_BORDER_COLORS_SUBTLE.success}`
            : `${STATUS_BG_COLORS_SUBTLE.muted} text-semantic-muted border ${STATUS_BORDER_COLORS_SUBTLE.muted}`
        }`}>
          <div className={`h-2 w-2 rounded-full ${isConnected ? `${STATUS_TEXT_COLORS.success} animate-pulse` : STATUS_TEXT_COLORS.muted}`} />
          <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <PipelineVisualization
        sessionId={sessionId}
        events={events}
        isLive={isConnected}
      />

      {/* Event Feed */}
      <div className="mt-4 max-h-64 overflow-y-auto rounded-lg bg-brand-paper/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-semantic-muted">Event Feed</h3>
        <div className="space-y-2">
          {events.slice(-10).reverse().map((event, index) => (
            <div
              key={index}
              className="flex items-start space-x-2 rounded border border-brand-outline/40 bg-brand-ink/50 p-2 text-xs"
            >
              <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
                event.code?.startsWith('OK') ? STATUS_TEXT_COLORS.success :
                event.code?.startsWith('REJECT') ? STATUS_TEXT_COLORS.error :
                event.code?.startsWith('NEED') ? STATUS_TEXT_COLORS.warning : STATUS_TEXT_COLORS.info
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-semantic-muted">{event.eye || 'System'}</span>
                  <span className="text-semantic-muted">
                    {new Date(event.createdAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 text-semantic-muted">
                  {event.code || event.type}: {event.md || event.message || 'Event received'}
                </p>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-center text-semantic-muted">No events yet. Waiting for pipeline activity...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LivePipelineFlow;
