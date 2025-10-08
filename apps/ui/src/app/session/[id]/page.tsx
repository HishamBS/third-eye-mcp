'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useUI } from '@/contexts/UIContext';
import { AdaptiveClarification } from '@/components/AdaptiveClarification';
import { SessionMemoryPanel } from '@/components/SessionMemoryPanel';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { StrictnessControls } from '@/components/StrictnessControls';

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

interface EyeCardProps {
  eye: string;
  onRun: (input: string) => void;
  loading?: boolean;
}

function EyeCard({ eye, onRun, loading }: EyeCardProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onRun(input.trim());
      setInput('');
    }
  };

  const getEyeIcon = (eyeName: string) => {
    switch (eyeName) {
      case 'sharingan': return '👁️';
      case 'rinnegan': return '🌀';
      case 'tenseigan': return '💫';
      case 'jogan': return '🔮';
      case 'byakugan': return '👀';
      case 'mangekyo': return '⚡';
      case 'prompt-helper': return '✨';
      default: return '👁️';
    }
  };

  const getEyeColor = (eyeName: string) => {
    switch (eyeName) {
      case 'sharingan': return 'from-red-500 to-orange-500';
      case 'rinnegan': return 'from-purple-500 to-indigo-500';
      case 'tenseigan': return 'from-blue-500 to-cyan-500';
      case 'jogan': return 'from-cyan-500 to-blue-500';
      case 'byakugan': return 'from-blue-300 to-blue-500';
      case 'mangekyo': return 'from-pink-500 to-red-500';
      case 'prompt-helper': return 'from-purple-400 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getEyeColor(eye)} p-6 rounded-lg shadow-lg transition-all hover:scale-105`}>
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">{getEyeIcon(eye)}</div>
        <h3 className="text-xl font-bold text-white capitalize">{eye.replace('-', ' ')}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${eye}...`}
          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/70 resize-none focus:outline-none focus:ring-2 focus:ring-white/50"
          rows={3}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white py-2 px-4 rounded transition-colors disabled:cursor-not-allowed"
        >
          {loading ? 'Running...' : `Run ${eye}`}
        </button>
      </form>
    </div>
  );
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { viewMode, strictness } = useUI();

  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [allEyes, setAllEyes] = useState<any[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [ambiguityScore, setAmbiguityScore] = useState<number | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [showStrictness, setShowStrictness] = useState(false);

  // Fetch all Eyes on mount
  useEffect(() => {
    fetchAllEyes();
  }, []);

  const fetchAllEyes = async () => {
    try {
      const response = await fetch('/api/eyes/all');
      if (response.ok) {
        const eyes = await response.json();
        setAllEyes(eyes);
      }
    } catch (error) {
      console.error('Failed to fetch eyes:', error);
    }
  };

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`ws://127.0.0.1:7070/ws/monitor?sessionId=${sessionId}`);

    ws.onopen = () => {
      console.log('📡 WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message:', message);

        if (message.type === 'run_completed') {
          fetchRuns();

          // Parse Sharingan envelope for ambiguity data
          const envelope = message.data?.envelope || message.data;
          if (envelope?.eye === 'sharingan' && envelope?.metadata) {
            const { ambiguityScore, clarifyingQuestions } = envelope.metadata;
            if (ambiguityScore !== undefined) {
              setAmbiguityScore(ambiguityScore);
              setClarifyingQuestions(clarifyingQuestions || []);
            }
          }
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
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  useEffect(() => {
    fetchRuns();
  }, [sessionId]);

  const fetchRuns = async () => {
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

  const runEye = async (eye: string, input: string) => {
    setLoading(eye);
    setCurrentInput(input);

    try {
      const response = await fetch('/api/mcp/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eye,
          input,
          sessionId,
          strictness, // Pass strictness settings
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Eye result:', result);
        await fetchRuns();
      }
    } catch (error) {
      console.error('Failed to run eye:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleClarificationAnswer = async (answers: Record<string, string>) => {
    console.log('Clarification answers:', answers);
    // Process answers and re-run with clarified input
    const clarifiedInput = `${currentInput}\n\nClarifications:\n${Object.entries(answers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n')}`;
    await runEye('sharingan', clarifiedInput);
    setAmbiguityScore(null);
    setClarifyingQuestions([]);
  };

  return (
    <div className="min-h-screen bg-brand-ink">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Sessions
              </Link>
              <h1 className="text-2xl font-semibold text-white">
                Session {sessionId.slice(0, 8)}
              </h1>
              <div className={`flex items-center space-x-2 rounded-full px-3 py-1 ${
                wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-400'
              }`}>
                <div className={`h-2 w-2 rounded-full ${wsConnected ? 'animate-pulse bg-green-400' : 'bg-slate-400'}`}></div>
                <span className="text-sm">{wsConnected ? 'Live' : 'Offline'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ViewModeToggle />
              <button
                onClick={() => setShowStrictness(!showStrictness)}
                className="rounded-full border border-brand-accent px-4 py-2 text-sm font-semibold text-brand-accent transition hover:bg-brand-accent/10"
              >
                ⚙️ Strictness
              </button>
              <Link href="/settings" className="text-slate-400 transition-colors hover:text-white">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Strictness Controls (Collapsible) */}
      {showStrictness && (
        <div className="border-b border-brand-outline/40 bg-brand-paper/50">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <StrictnessControls />
          </div>
        </div>
      )}

      {/* Ambiguity Bar (WOW Feature) */}
      {ambiguityScore !== null && clarifyingQuestions.length > 0 && (
        <div className="border-b border-brand-outline/40 bg-brand-paperElev/80">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <AdaptiveClarification
              ambiguityScore={ambiguityScore}
              ambiguousTerms={[]}
              missingContext={[]}
              clarifyingQuestions={clarifyingQuestions}
              onAnswerSubmit={handleClarificationAnswer}
              onSkip={() => {
                setAmbiguityScore(null);
                setClarifyingQuestions([]);
              }}
            />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px,1fr,300px]">
          {/* Eyes Panel */}
          <div>
            <h2 className="mb-6 text-xl font-semibold text-white">
              Eyes {viewMode === 'novice' && '(Validators)'}
            </h2>
            <div className="max-h-[calc(100vh-250px)] space-y-4 overflow-y-auto pr-2">
              {allEyes.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Loading Eyes...
                </div>
              ) : (
                allEyes.map((eye) => (
                  <EyeCard
                    key={eye.id}
                    eye={eye.id}
                    onRun={(input) => runEye(eye.id, input)}
                    loading={loading === eye.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Timeline Panel */}
          <div>
            <h2 className="mb-6 text-xl font-semibold text-white">Timeline</h2>
            <div className="space-y-4">
              {runs.length === 0 ? (
                <div className="rounded-lg border border-brand-accent/30 bg-gradient-to-br from-brand-paperElev/50 to-brand-paper/50 p-8">
                  <div className="mb-6 text-center">
                    <div className="mb-4 text-6xl">👁️</div>
                    <h3 className="mb-2 text-xl font-semibold text-white">Welcome to Your Session</h3>
                    <p className="text-brand-accent">Session ID: {session?.id}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Created {session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'just now'}
                    </p>
                  </div>

                  <div className="mb-6 rounded-lg border border-brand-accent/20 bg-brand-ink/30 p-6">
                    <h4 className="mb-3 font-semibold text-brand-accent">Getting Started</h4>
                    <ol className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">1</span>
                        <span>Select an Eye from the left sidebar to validate your prompt or code</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">2</span>
                        <span>Each Eye specializes in different validation tasks (ambiguity detection, planning, testing, etc.)</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">3</span>
                        <span>View validation results here in the timeline as they complete</span>
                      </li>
                    </ol>
                  </div>

                  <div className="text-center text-sm text-slate-500">
                    💡 Tip: Use <Link href="/pipelines" className="text-brand-accent hover:underline">Pipelines</Link> to run multiple Eyes in sequence
                  </div>
                </div>
              ) : (
                runs.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-lg border border-brand-outline/50 bg-brand-paper/50 p-6 transition-all hover:border-brand-accent/40"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {run.eye === 'sharingan' ? '👁️' :
                           run.eye === 'rinnegan' ? '🌀' :
                           run.eye === 'jogan' ? '🔮' : '💫'}
                        </span>
                        <div>
                          <h3 className="font-semibold capitalize text-white">{run.eye.replace('-', ' ')}</h3>
                          <p className="text-sm text-slate-400">
                            {new Date(run.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-400">
                        <div>{run.provider}/{run.model}</div>
                        {run.latencyMs && <div>{run.latencyMs}ms</div>}
                        {run.tokensIn && run.tokensOut && (
                          <div>{run.tokensIn}→{run.tokensOut} tokens</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-2 font-medium text-slate-300">Input</h4>
                        <div className="rounded bg-brand-ink p-3 text-sm text-slate-300">
                          {run.inputMd}
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-2 font-medium text-slate-300">Output</h4>
                        <div className="rounded bg-brand-ink p-3">
                          {run.outputJson?.md ? (
                            <div className="whitespace-pre-wrap text-sm text-slate-300">
                              {run.outputJson.md}
                            </div>
                          ) : (
                            <pre className="overflow-x-auto text-xs text-slate-400">
                              {JSON.stringify(run.outputJson, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Session Memory Panel (WOW Feature) */}
          <div>
            <h2 className="mb-6 text-xl font-semibold text-white">
              {viewMode === 'novice' ? 'Related History' : 'Session Memory'}
            </h2>
            <SessionMemoryPanel
              byakuganEvents={[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
