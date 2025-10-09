'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useUI } from '@/contexts/UIContext';
import { SessionMemoryPanel } from '@/components/SessionMemoryPanel';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { StrictnessControls } from '@/components/StrictnessControls';
import type { PipelineEvent } from '@/types/pipeline';
import type { Envelope } from '@third-eye/types';
import { TOOL_NAME } from '@third-eye/types';

interface Run {
  id: string;
  eye: string;
  provider: string;
  model: string;
  inputMd: string;
  outputJson: Record<string, unknown>;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  createdAt: string;
}

interface Session {
  id: string;
  agentName: string;
  createdAt: string;
  status: string;
}

interface EyeDefinition {
  id: string;
  name: string;
  description: string;
  source: 'built-in' | 'custom';
}

export default function PlaygroundPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { strictness, setSelectedSession } = useUI();

  const [session, setSession] = useState<Session | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [byakuganEvents, setByakuganEvents] = useState<PipelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [showStrictness, setShowStrictness] = useState(false);
  const [eyes, setEyes] = useState<EyeDefinition[]>([]);
  const [selectedEye, setSelectedEye] = useState<string>('');
  const [eyeInput, setEyeInput] = useState('');
  const [eyeLoading, setEyeLoading] = useState(false);
  const [eyeError, setEyeError] = useState<string | null>(null);
  const [eyeResult, setEyeResult] = useState<Envelope | null>(null);

  // Set selected session in global context
  useEffect(() => {
    if (sessionId) {
      setSelectedSession(sessionId);
    }
  }, [sessionId, setSelectedSession]);

  useEffect(() => {
    const loadEyes = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
        const response = await fetch(`${API_URL}/api/eyes/all`);
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        const list: EyeDefinition[] = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setEyes(list);
        if (list.length > 0) {
          setSelectedEye(list[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch eyes:', error);
      }
    };

    loadEyes();
  }, []);

  useEffect(() => {
    setEyeError(null);
    setEyeResult(null);
  }, [selectedEye]);

  // Fetch session on mount
  useEffect(() => {
    fetchSession();
    fetchRuns();
    fetchSessionEvents();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  // WebSocket connection for real-time updates with ping/pong
  useEffect(() => {
    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:7070';
    const wsUrl = `${baseWsUrl.replace(/\/$/, '')}/ws/monitor?sessionId=${sessionId}`;
    const ws = new WebSocket(wsUrl);
    let pingInterval: NodeJS.Timeout;

    ws.onopen = () => {
      console.log(`📡 WebSocket connected to ${wsUrl}`);
      setWsConnected(true);

      // Send ping every 15 seconds to keep connection alive
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Respond to server pings with pong
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        // Ignore pong responses
        if (message.type === 'pong') return;

        console.log('📨 WebSocket message:', message);

        if (message.type === 'run_completed' || message.type === 'pipeline_event') {
          fetchRuns();
          fetchSessionEvents();
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('📡 WebSocket disconnected');
      setWsConnected(false);
      if (pingInterval) clearInterval(pingInterval);
    };

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      ws.close();
    };
  }, [sessionId]);

  const fetchRuns = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`/api/session/${sessionId}/runs`);
      if (response.ok) {
        const runsData = await response.json();
        setRuns(runsData);
      }
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    }
  };

  const fetchSessionEvents = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`/api/session/${sessionId}/events`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const events: PipelineEvent[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      const byakuganOnly = events.filter((event) =>
        (event.eye ?? '').toLowerCase().includes('byakugan')
      );
      setByakuganEvents(byakuganOnly);
    } catch (error) {
      console.error('Failed to fetch session events:', error);
    }
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    setLoading(true);

    try {
      // Submit task to MCP - Overseer will auto-route through pipeline
      const response = await fetch('/api/mcp/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: taskInput.trim(),
          sessionId,
          strictness, // Pass strictness settings
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Task submitted:', result);
        setTaskInput(''); // Clear input after submission
        fetchRuns(); // Refresh runs
      } else {
        console.error('❌ Task submission failed:', await response.text());
      }
    } catch (error) {
      console.error('Failed to submit task:', error);
    } finally {
      setLoading(false);
    }
  };

  const runEyeTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEye || !eyeInput.trim()) {
      setEyeError('Select an eye and provide input to test.');
      return;
    }

    setEyeLoading(true);
    setEyeError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/${selectedEye}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          input: eyeInput.trim(),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        setEyeError(text || 'Eye execution failed');
        return;
      }

      const payload = await response.json();
      const resultEnvelope: Envelope | null =
        (payload && payload.result) ||
        (payload?.data && payload.data.result) ||
        (payload?.data && !payload.data.result ? payload.data : null);

      setEyeResult(resultEnvelope);
      setEyeInput('');

      if (payload?.sessionId && payload.sessionId !== sessionId) {
        setSelectedSession(payload.sessionId);
      }

      await fetchRuns();
      await fetchSessionEvents();
    } catch (error) {
      console.error('Failed to test eye:', error);
      setEyeError(error instanceof Error ? error.message : 'Failed to execute eye');
    } finally {
      setEyeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Session: {session?.agentName || sessionId.slice(0, 8)}
              </h1>
              <span className={`px-2 py-1 rounded text-xs ${
                wsConnected
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {wsConnected ? '● Connected' : '○ Disconnected'}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <ViewModeToggle />
              <button
                onClick={() => setShowStrictness(!showStrictness)}
                className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                ⚙️ Strictness
              </button>
              <Link
                href={`/monitor?sessionId=${sessionId}`}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                📊 Monitor
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Strictness Controls */}
      {showStrictness && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <StrictnessControls />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Task Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Submission */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Run Overseer Pipeline
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Send a full task through <code className="font-mono text-xs">{TOOL_NAME}</code>. Overseer analyzes the request,
                selects the Eye sequence, and records every step in this playground session.
              </p>

              <form onSubmit={submitTask} className="space-y-4">
                <textarea
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="Describe what you need (e.g., 'Create a palm care guide', 'Analyze this data', 'Write a function to...')"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !taskInput.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Processing through pipeline...' : '🚀 Submit Task'}
                </button>
              </form>
            </div>

            {/* Individual Eye Testing */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Test Individual Eye
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Run a single Eye directly to validate personas and prompts before wiring them into a pipeline.
                Results are logged to this session so you can inspect them in the monitor.
              </p>

              <form onSubmit={runEyeTest} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Eye
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    value={selectedEye}
                    onChange={(e) => setSelectedEye(e.target.value)}
                    disabled={eyes.length === 0 || eyeLoading}
                  >
                    {eyes.length === 0 && (
                      <option value="">Loading Eyes...</option>
                    )}
                    {eyes.map((eye) => (
                      <option key={eye.id} value={eye.id}>
                        {eye.name} ({eye.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Input
                  </label>
                  <textarea
                    value={eyeInput}
                    onChange={(e) => setEyeInput(e.target.value)}
                    placeholder="Provide the exact prompt or payload this Eye should handle."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    disabled={eyeLoading}
                  />
                </div>

                {eyeError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500 dark:text-red-300">
                    {eyeError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={eyeLoading || !selectedEye || !eyeInput.trim()}
                  className="w-full bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {eyeLoading ? '⏳ Running Eye...' : '👁️ Execute Eye'}
                </button>
              </form>

              {eyeResult && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {eyeResult.eye || selectedEye} &middot; {eyeResult.code}
                      </p>
                      {eyeResult.summary && (
                        <p className="mt-1 text-gray-600 dark:text-gray-300">
                          {eyeResult.summary}
                        </p>
                      )}
                    </div>
                    {eyeResult.verdict && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          eyeResult.verdict === 'APPROVED'
                            ? 'bg-green-500/20 text-green-600 dark:text-green-300'
                            : eyeResult.verdict === 'NEEDS_INPUT'
                              ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-300'
                              : 'bg-red-500/20 text-red-600 dark:text-red-300'
                        }`}
                      >
                        {eyeResult.verdict}
                      </span>
                    )}
                  </div>

                  {eyeResult.md && (
                    <p className="mt-3 text-gray-700 dark:text-gray-400 whitespace-pre-wrap">
                      {eyeResult.md}
                    </p>
                  )}

                  <pre className="mt-4 max-h-64 overflow-x-auto overflow-y-auto rounded bg-gray-900/90 p-3 text-xs text-gray-100">
                    {JSON.stringify(eyeResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Pipeline History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Pipeline History ({runs.length})
              </h2>

              {runs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No runs yet. Submit a task above to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {runs.slice().reverse().map((run) => (
                    <div
                      key={run.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-mono">
                            {run.eye}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(run.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {run.tokensIn && run.tokensOut && (
                            <span>{run.tokensIn}→{run.tokensOut} tokens • </span>
                          )}
                          {run.latencyMs && <span>{run.latencyMs}ms</span>}
                        </div>
                      </div>

                      <div className="text-sm">
                        <details className="cursor-pointer">
                          <summary className="font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                            Input
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                            {run.inputMd}
                          </pre>
                        </details>

                        <details className="mt-2 cursor-pointer">
                          <summary className="font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                            Output
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                            {JSON.stringify(run.outputJson, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Session Memory */}
          <div className="lg:col-span-1">
            <SessionMemoryPanel byakuganEvents={byakuganEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}
