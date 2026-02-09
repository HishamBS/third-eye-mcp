"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  BarChart3,
  Loader2,
  Rocket,
  Eye as LucideEye,
} from "lucide-react";
import { useUI } from "@/contexts/UIContext";
import { SessionMemoryPanel } from "@/components/SessionMemoryPanel";
import {
  ViewModeToggle,
  ViewModeDescription,
} from "@/components/ViewModeToggle";
import { StrictnessControls } from "@/components/StrictnessControls";
import type { WSPipelineEvent } from "@/types/pipeline";
import type { Envelope, Session, Run, Eye } from "@third-eye/types";
import { TOOL_NAME } from "@third-eye/types";
import { getApiUrl, WS_BASE_URL, API_BASE_URL } from "@/constants/api";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
  STATUS_BG_COLORS,
} from "@/constants/color-mappings";
import { toast } from "sonner";
import { TIMING } from "@/constants/timing";

/**
 * Minimum character length for task/input submissions.
 * Prevents submitting single characters or very short inputs
 * that would likely fail validation or produce poor results.
 */
const MIN_INPUT_LENGTH = 10;

/** Use shared Eye type with only the fields this page needs */
type EyeDefinition = Pick<Eye, "id" | "name" | "description">;

export default function PlaygroundPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { strictness, setSelectedSession, viewMode } = useUI();
  const API_BASE_URL = getApiUrl();

  const [session, setSession] = useState<Session | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [byakuganEvents, setByakuganEvents] = useState<WSPipelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [showStrictness, setShowStrictness] = useState(false);
  const [eyes, setEyes] = useState<EyeDefinition[]>([]);
  const [selectedEye, setSelectedEye] = useState<string>("");
  const [eyeInput, setEyeInput] = useState("");
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
        const response = await fetch(`${API_BASE_URL}/api/eyes/all`);
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
        console.error("Failed to fetch eyes:", error);
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

  /**
   * Fetch session with retry logic and exponential backoff.
   * Bug fix: New playground sessions may not be immediately available,
   * causing 404 errors. We retry with backoff to handle race conditions.
   */
  const fetchSession = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 500; // Start with 500ms delay

    try {
      const response = await fetch(`${API_BASE_URL}/api/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.data);
      } else if (response.status === 404 && retryCount < MAX_RETRIES) {
        // Session not found - might be race condition, retry with backoff
        const delay = BASE_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.log(
          `Session not found, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
        );
        setTimeout(() => fetchSession(retryCount + 1), delay);
      } else if (response.status === 404) {
        console.warn("Session not found after retries:", sessionId);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        setTimeout(() => fetchSession(retryCount + 1), delay);
      }
    }
  };

  // WebSocket connection for real-time updates with ping/pong
  useEffect(() => {
    const wsUrl = `${WS_BASE_URL.replace(/\/$/, "")}/ws/monitor?sessionId=${sessionId}`;
    const ws = new WebSocket(wsUrl);
    let pingInterval: NodeJS.Timeout;

    ws.onopen = () => {
      console.log(`📡 WebSocket connected to ${wsUrl}`);
      setWsConnected(true);

      // Send ping every 15 seconds to keep connection alive
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, TIMING.PLAYGROUND_TIMEOUT_MS);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Respond to server pings with pong
        if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          return;
        }

        // Ignore pong responses
        if (message.type === "pong") return;

        console.log("📨 WebSocket message:", message);

        if (
          message.type === "run_completed" ||
          message.type === "pipeline_event"
        ) {
          fetchRuns();
          fetchSessionEvents();
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = () => {
      console.error(
        `WebSocket connection failed: ${wsUrl} — is the backend running on port 7070?`,
      );
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log("📡 WebSocket disconnected");
      setWsConnected(false);
      if (pingInterval) clearInterval(pingInterval);
    };

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      ws.close();
    };
  }, [sessionId]);

  /**
   * Fetch runs with silent 404 handling (empty list is acceptable for new sessions)
   */
  const fetchRuns = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/session/${sessionId}/runs`,
      );
      if (response.ok) {
        const runsData = await response.json();
        // Handle both { data: [...] } and direct array formats
        const runsArray = Array.isArray(runsData?.data)
          ? runsData.data
          : Array.isArray(runsData)
            ? runsData
            : [];
        setRuns(runsArray);
      } else if (response.status === 404) {
        // Session may not have runs yet, this is acceptable
        setRuns([]);
      }
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    }
  };

  /**
   * Fetch session events with silent 404 handling (empty list is acceptable for new sessions)
   */
  const fetchSessionEvents = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/session/${sessionId}/events`,
      );
      if (!response.ok) {
        if (response.status === 404) {
          // Session may not have events yet, this is acceptable
          setByakuganEvents([]);
        }
        return;
      }

      const payload = await response.json();
      const events: WSPipelineEvent[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      const byakuganOnly = events.filter((event) =>
        (event.eye ?? "").toLowerCase().includes("byakugan"),
      );
      setByakuganEvents(byakuganOnly);
    } catch (error) {
      console.error("Failed to fetch session events:", error);
    }
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = taskInput.trim();

    if (!trimmedInput) {
      toast.warning("Please enter a task description");
      return;
    }

    if (trimmedInput.length < MIN_INPUT_LENGTH) {
      toast.warning(
        `Task description too short. Please provide at least ${MIN_INPUT_LENGTH} characters.`,
      );
      return;
    }

    setLoading(true);

    try {
      // Submit task to MCP - Overseer will auto-route through pipeline
      const response = await fetch(`${API_BASE_URL}/api/mcp/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: taskInput.trim(),
          sessionId,
          strictness, // Pass strictness settings
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Task submitted:", result);
        setTaskInput(""); // Clear input after submission
        fetchRuns(); // Refresh runs
        toast.success("Task submitted to pipeline");
      } else {
        const errorText = await response.text();
        console.error("❌ Task submission failed:", errorText);
        // Parse error response if JSON, otherwise use raw text
        let errorMessage = "Task submission failed";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Failed to submit task:", error);
      toast.error(
        error instanceof Error
          ? `Failed to submit: ${error.message}`
          : "Failed to submit task",
      );
    } finally {
      setLoading(false);
    }
  };

  const runEyeTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = eyeInput.trim();

    if (!selectedEye) {
      const errorMsg = "Please select an Eye to test.";
      setEyeError(errorMsg);
      toast.warning(errorMsg);
      return;
    }

    if (!trimmedInput) {
      const errorMsg = "Please provide input to test.";
      setEyeError(errorMsg);
      toast.warning(errorMsg);
      return;
    }

    if (trimmedInput.length < MIN_INPUT_LENGTH) {
      const errorMsg = `Input too short. Please provide at least ${MIN_INPUT_LENGTH} characters.`;
      setEyeError(errorMsg);
      toast.warning(errorMsg);
      return;
    }

    setEyeLoading(true);
    setEyeError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/eyes/${selectedEye}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            input: eyeInput.trim(),
          }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Eye execution failed";
        try {
          const errorJson = JSON.parse(text);
          errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        setEyeError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      const payload = await response.json();
      const resultEnvelope: Envelope | null =
        (payload && payload.result) ||
        (payload?.data && payload.data.result) ||
        (payload?.data && !payload.data.result ? payload.data : null);

      setEyeResult(resultEnvelope);
      setEyeInput("");

      if (payload?.sessionId && payload.sessionId !== sessionId) {
        setSelectedSession(payload.sessionId);
      }

      await fetchRuns();
      await fetchSessionEvents();
    } catch (error) {
      console.error("Failed to test eye:", error);
      setEyeError(
        error instanceof Error ? error.message : "Failed to execute eye",
      );
    } finally {
      setEyeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-paper dark:bg-brand-ink">
      {/* Header */}
      <div className="bg-brand-paper-elev dark:bg-brand-ink border-b border-brand-outline/40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-semantic-muted dark:text-semantic-muted hover:text-brand-foreground dark:hover:text-gray-100"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-brand-foreground dark:text-gray-100">
                Session: {session?.agentName || sessionId.slice(0, 8)}
              </h1>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  wsConnected
                    ? `${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success}`
                    : `${STATUS_BG_COLORS_SUBTLE.error} ${STATUS_TEXT_COLORS.error}`
                }`}
              >
                {wsConnected ? "● Connected" : "○ Disconnected"}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <ViewModeToggle />
              <button
                onClick={() => setShowStrictness(!showStrictness)}
                className="flex items-center gap-2 px-3 py-2 bg-brand-primary text-brand-foreground rounded hover:bg-brand-primary-hover"
              >
                <Settings className="h-4 w-4" />
                Strictness
              </button>
              <Link
                href={`/monitor?sessionId=${sessionId}`}
                className="flex items-center gap-2 px-3 py-2 bg-brand-primary text-brand-foreground rounded hover:bg-brand-primary-hover"
              >
                <BarChart3 className="h-4 w-4" />
                Monitor
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
        <ViewModeDescription />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Task Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Submission */}
            <div className="bg-brand-paper-elev dark:bg-brand-ink rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-brand-foreground dark:text-gray-100">
                Run Overseer Pipeline
              </h2>
              <p className="text-sm text-semantic-muted dark:text-semantic-muted mb-4">
                Send a full task through{" "}
                <code className="font-mono text-xs">{TOOL_NAME}</code>. Overseer
                analyzes the request, selects the Eye sequence, and records
                every step in this playground session.
              </p>

              <form onSubmit={submitTask} className="space-y-4">
                <textarea
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="Describe what you need (e.g., 'Create a palm care guide', 'Analyze this data', 'Write a function to...')"
                  className="w-full px-4 py-3 bg-brand-paper dark:bg-brand-ink border border-brand-outline/50 rounded-lg text-brand-foreground dark:text-gray-100 placeholder-brand-outline dark:placeholder-brand-outline resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  rows={6}
                  disabled={loading}
                />
                {/* Character count indicator */}
                <div className="flex justify-between text-xs text-semantic-muted">
                  <span>
                    {taskInput.trim().length < MIN_INPUT_LENGTH
                      ? `Minimum ${MIN_INPUT_LENGTH} characters required`
                      : ""}
                  </span>
                  <span
                    className={
                      taskInput.trim().length < MIN_INPUT_LENGTH
                        ? STATUS_TEXT_COLORS.warning
                        : STATUS_TEXT_COLORS.success
                    }
                  >
                    {taskInput.trim().length} / {MIN_INPUT_LENGTH}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={
                    loading || taskInput.trim().length < MIN_INPUT_LENGTH
                  }
                  className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-semantic-muted text-brand-foreground py-3 px-6 rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing through pipeline...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5" />
                      Submit Task
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Individual Eye Testing */}
            <div className="bg-brand-paper-elev dark:bg-brand-ink rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-brand-foreground dark:text-gray-100">
                Test Individual Eye
              </h2>
              <p className="text-sm text-semantic-muted dark:text-semantic-muted mb-4">
                Run a single Eye directly to validate personas and prompts
                before wiring them into a pipeline. Results are logged to this
                session so you can inspect them in the monitor.
              </p>

              <form onSubmit={runEyeTest} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-foreground dark:text-semantic-muted">
                    Eye
                  </label>
                  <select
                    className="w-full rounded-lg border border-brand-outline/50 bg-brand-paper px-3 py-2 text-sm dark:bg-brand-ink dark:text-gray-100"
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
                  <label className="mb-1 block text-sm font-medium text-brand-foreground dark:text-semantic-muted">
                    Input
                  </label>
                  <textarea
                    value={eyeInput}
                    onChange={(e) => setEyeInput(e.target.value)}
                    placeholder="Provide the exact prompt or payload this Eye should handle."
                    className="w-full px-4 py-3 bg-brand-paper dark:bg-brand-ink border border-brand-outline/50 rounded-lg text-brand-foreground dark:text-gray-100 placeholder-brand-outline dark:placeholder-brand-outline resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    rows={4}
                    disabled={eyeLoading}
                  />
                </div>

                {eyeError && (
                  <div
                    className={`rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} px-3 py-2 text-sm ${STATUS_TEXT_COLORS.error}`}
                  >
                    {eyeError}
                  </div>
                )}

                {/* Character count indicator for eye input */}
                <div className="flex justify-between text-xs text-semantic-muted">
                  <span>
                    {eyeInput.trim().length < MIN_INPUT_LENGTH
                      ? `Minimum ${MIN_INPUT_LENGTH} characters required`
                      : ""}
                  </span>
                  <span
                    className={
                      eyeInput.trim().length < MIN_INPUT_LENGTH
                        ? STATUS_TEXT_COLORS.warning
                        : STATUS_TEXT_COLORS.success
                    }
                  >
                    {eyeInput.trim().length} / {MIN_INPUT_LENGTH}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={
                    eyeLoading ||
                    !selectedEye ||
                    eyeInput.trim().length < MIN_INPUT_LENGTH
                  }
                  className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-semantic-muted text-brand-foreground py-3 px-6 rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {eyeLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Running Eye...
                    </>
                  ) : (
                    <>
                      <LucideEye className="h-5 w-5" />
                      Execute Eye
                    </>
                  )}
                </button>
              </form>

              {eyeResult && (
                <div className="mt-6 rounded-lg border border-brand-outline/40 bg-brand-paper p-4 text-sm dark:bg-brand-ink">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-foreground dark:text-gray-100">
                        {eyeResult.eye || selectedEye} &middot; {eyeResult.code}
                      </p>
                      {eyeResult.summary && (
                        <p className="mt-1 text-semantic-muted dark:text-semantic-muted">
                          {eyeResult.summary}
                        </p>
                      )}
                    </div>
                    {eyeResult.verdict && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          eyeResult.verdict === "APPROVED"
                            ? `${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success}`
                            : eyeResult.verdict === "NEEDS_INPUT"
                              ? `${STATUS_BG_COLORS_SUBTLE.warning} ${STATUS_TEXT_COLORS.warning}`
                              : `${STATUS_BG_COLORS_SUBTLE.error} ${STATUS_TEXT_COLORS.error}`
                        }`}
                      >
                        {eyeResult.verdict}
                      </span>
                    )}
                  </div>

                  {eyeResult.md && (
                    <p className="mt-3 text-brand-foreground dark:text-semantic-muted whitespace-pre-wrap">
                      {eyeResult.md}
                    </p>
                  )}

                  {viewMode === "expert" && (
                    <pre className="mt-4 max-h-64 overflow-x-auto overflow-y-auto rounded bg-brand-paperElev p-3 text-xs text-brand-foreground">
                      {JSON.stringify(eyeResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Pipeline History */}
            <div className="bg-brand-paper-elev dark:bg-brand-ink rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-brand-foreground dark:text-gray-100">
                Pipeline History ({runs.length})
              </h2>

              {runs.length === 0 ? (
                <p className="text-semantic-muted dark:text-semantic-muted text-center py-8">
                  No runs yet. Submit a task above to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {runs
                    .slice()
                    .reverse()
                    .map((run) => (
                      <div
                        key={run.id}
                        className="border border-brand-outline/40 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 ${STATUS_BG_COLORS_SUBTLE.info} ${STATUS_TEXT_COLORS.info} rounded text-xs font-mono`}
                            >
                              {run.eyeId}
                            </span>
                            <span className="text-xs text-semantic-muted dark:text-semantic-muted">
                              {new Date(run.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {viewMode === "expert" && (
                            <div className="text-xs text-semantic-muted dark:text-semantic-muted">
                              {run.tokensIn && run.tokensOut && (
                                <span>
                                  {run.tokensIn}→{run.tokensOut} tokens •{" "}
                                </span>
                              )}
                              {run.latencyMs && <span>{run.latencyMs}ms</span>}
                            </div>
                          )}
                        </div>

                        <div className="text-sm">
                          <details className="cursor-pointer">
                            <summary className="font-semibold text-brand-foreground dark:text-semantic-muted hover:text-brand-foreground dark:hover:text-gray-100">
                              Input
                            </summary>
                            <pre className="mt-2 p-2 bg-brand-paper dark:bg-brand-ink rounded text-xs overflow-x-auto">
                              {run.inputMd}
                            </pre>
                          </details>

                          <details className="mt-2 cursor-pointer">
                            <summary className="font-semibold text-brand-foreground dark:text-semantic-muted hover:text-brand-foreground dark:hover:text-gray-100">
                              Output
                            </summary>
                            <pre className="mt-2 p-2 bg-brand-paper dark:bg-brand-ink rounded text-xs overflow-x-auto">
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
