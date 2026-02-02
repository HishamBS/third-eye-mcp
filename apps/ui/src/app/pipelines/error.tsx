"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

/**
 * Pipeline Page Error Boundary
 *
 * Catches errors specific to the Pipeline Editor page.
 * Common errors: Canvas rendering, node/edge validation, save failures.
 */
export default function PipelinesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PipelinesError] Pipeline editor error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-surface p-4">
      <div
        className={`max-w-md w-full rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-8 text-center shadow-xl`}
      >
        <div className="flex justify-center mb-6">
          <div className={`rounded-full ${STATUS_BG_COLORS_SUBTLE.error} p-4`}>
            <AlertTriangle className={`h-12 w-12 ${STATUS_TEXT_COLORS.error}`} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-brand-foreground mb-2">
          Pipeline Editor Error
        </h1>

        <p className="text-semantic-muted mb-4">
          The pipeline editor encountered an error. This may be due to:
        </p>

        <ul className="text-left text-sm text-semantic-muted mb-6 space-y-1">
          <li>- Invalid pipeline configuration</li>
          <li>- Canvas rendering issue</li>
          <li>- Node or edge data corruption</li>
        </ul>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 text-left">
            <details className="text-xs">
              <summary className="cursor-pointer text-semantic-muted hover:text-brand-foreground">
                Error Details
              </summary>
              <pre className="mt-2 p-3 bg-brand-paper rounded-lg overflow-auto max-h-40 text-semantic-muted">
                {error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
              </pre>
            </details>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-outline/40 text-brand-foreground hover:bg-brand-paper transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
