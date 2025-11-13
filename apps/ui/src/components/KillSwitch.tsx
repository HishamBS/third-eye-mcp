import { useState } from "react";
import { AlertCircle, RotateCw, Eye } from "lucide-react";
import type { BaseEnvelope } from "@third-eye/eyes";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

export interface KillSwitchProps {
  runId: string;
  eye: string;
  originalInput: string;
  originalResult: BaseEnvelope;
  sessionId: string;
  onRerun: (runId: string, eye: string, input: string) => Promise<BaseEnvelope>;
}

export function KillSwitch({
  runId,
  eye,
  originalInput,
  originalResult,
  sessionId,
  onRerun,
}: KillSwitchProps) {
  const [isRerunning, setIsRerunning] = useState(false);
  const [rerunResult, setRerunResult] = useState<BaseEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRerun = async () => {
    setIsRerunning(true);
    setError(null);

    try {
      const result = await onRerun(runId, eye, originalInput);
      setRerunResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rerun failed");
    } finally {
      setIsRerunning(false);
    }
  };

  const hasChanged =
    rerunResult &&
    (rerunResult.verdict !== originalResult.verdict ||
      rerunResult.code !== originalResult.code ||
      rerunResult.confidence !== originalResult.confidence);

  return (
    <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${STATUS_BG_COLORS_SUBTLE.error} border ${STATUS_BORDER_COLORS_SUBTLE.error}`}
          >
            <AlertCircle className={`h-5 w-5 ${STATUS_TEXT_COLORS.error}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brand-foreground">
              Kill Switch
            </h3>
            <p className="text-sm text-semantic-muted">
              Re-validate with same or different Eye
            </p>
          </div>
        </div>

        <button
          onClick={handleRerun}
          disabled={isRerunning}
          className={`flex items-center rounded-lg border ${STATUS_BG_COLORS_SUBTLE.error} hover:opacity-80 ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_TEXT_COLORS.error} px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRerunning ? (
            <>
              <RotateCw className="h-4 w-4 mr-2 animate-spin" />
              Re-running...
            </>
          ) : (
            <>
              <RotateCw className="h-4 w-4 mr-2" />
              Re-run {eye}
            </>
          )}
        </button>
      </div>

      {error && (
        <div
          className={`mt-4 rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-3 text-sm ${STATUS_TEXT_COLORS.error}`}
        >
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {rerunResult && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand-gold" />
            <span className="text-sm font-semibold text-semantic-muted">
              Rerun Result
            </span>
            {hasChanged && (
              <span
                className={`px-2 py-0.5 rounded-full ${STATUS_BG_COLORS_SUBTLE.warning} border ${STATUS_BORDER_COLORS_SUBTLE.warning} ${STATUS_TEXT_COLORS.warning} text-xs`}
              >
                Changed
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Original Result */}
            <div className="rounded-lg border border-brand-outline/40 bg-brand-paperElev/60 p-4">
              <p className="text-xs font-semibold text-semantic-muted mb-2">
                ORIGINAL
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-semantic-muted">Verdict:</span>
                  <span
                    className={`text-sm font-semibold ${
                      originalResult.verdict === "APPROVED"
                        ? STATUS_TEXT_COLORS.success
                        : originalResult.verdict === "REJECTED"
                          ? STATUS_TEXT_COLORS.error
                          : STATUS_TEXT_COLORS.warning
                    }`}
                  >
                    {originalResult.verdict}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-semantic-muted">Code:</span>
                  <span className="text-sm text-semantic-muted">
                    {originalResult.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-semantic-muted">
                    Confidence:
                  </span>
                  <span className="text-sm text-semantic-muted">
                    {originalResult.confidence}%
                  </span>
                </div>
              </div>
            </div>

            {/* Rerun Result */}
            <div className="rounded-lg border border-brand-outline/40 bg-brand-paperElev/60 p-4">
              <p className="text-xs font-semibold text-semantic-muted mb-2">
                RERUN
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-semantic-muted">Verdict:</span>
                  <span
                    className={`text-sm font-semibold ${
                      rerunResult.verdict === "APPROVED"
                        ? STATUS_TEXT_COLORS.success
                        : rerunResult.verdict === "REJECTED"
                          ? STATUS_TEXT_COLORS.error
                          : STATUS_TEXT_COLORS.warning
                    } ${rerunResult.verdict !== originalResult.verdict ? "underline" : ""}`}
                  >
                    {rerunResult.verdict}
                    {rerunResult.verdict !== originalResult.verdict && " →"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-semantic-muted">Code:</span>
                  <span
                    className={`text-sm text-semantic-muted ${rerunResult.code !== originalResult.code ? "underline" : ""}`}
                  >
                    {rerunResult.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-semantic-muted">
                    Confidence:
                  </span>
                  <span
                    className={`text-sm text-semantic-muted ${rerunResult.confidence !== originalResult.confidence ? "underline" : ""}`}
                  >
                    {rerunResult.confidence}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-brand-outline/40 bg-brand-paper/60 p-4">
            <p className="text-xs font-semibold text-semantic-muted mb-2">
              SUMMARY
            </p>
            <p className="text-sm text-semantic-muted">{rerunResult.summary}</p>
            {rerunResult.details && (
              <p className="mt-2 text-sm text-semantic-muted">
                {rerunResult.details}
              </p>
            )}
          </div>

          {rerunResult.suggestions && rerunResult.suggestions.length > 0 && (
            <div className="rounded-lg border border-brand-outline/40 bg-brand-paper/60 p-4">
              <p className="text-xs font-semibold text-semantic-muted mb-2">
                SUGGESTIONS
              </p>
              <ul className="space-y-1">
                {rerunResult.suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-semantic-muted flex gap-2"
                  >
                    <span className="text-brand-gold">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KillSwitch;
