/**
 * Unified Markdown Renderer Component
 *
 * Single source of truth for rendering markdown across the application.
 * Handles edge cases like escaped newlines and JSON detection.
 *
 * Per R01: SSOT for markdown rendering
 * Per R04: Memoized for performance
 * Per R07: Strict typing
 */

"use client";

import { useMemo } from "react";
import { renderMarkdown } from "@/lib/markdown";

interface MarkdownRendererProps {
  /**
   * Markdown content to render
   */
  content: string | null | undefined;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * If true, show an error state when content appears to be JSON instead of markdown
   * Default: false (gracefully render JSON as code block)
   */
  errorOnJson?: boolean;
}

/**
 * Detect if content is JSON (data quality issue - should be fixed at source)
 */
function isJsonContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/**
 * Detect if content has escaped newlines (data quality issue - should be fixed at source)
 */
function hasEscapedNewlines(content: string): boolean {
  return content.includes("\\n");
}

/**
 * Process content to fix common data quality issues
 */
function processContent(content: string): string {
  let processed = content;

  // Fix escaped newlines (should be fixed at source, but handle gracefully)
  if (hasEscapedNewlines(content)) {
    console.warn(
      "[MarkdownRenderer] Content has escaped newlines - this should be fixed at source",
    );
    processed = processed.replace(/\\n/g, "\n");
  }

  return processed;
}

/**
 * MarkdownRenderer - Unified markdown rendering component
 *
 * Use this component for ALL markdown rendering in the application.
 * It handles:
 * - Escaped newlines (\\n -> \n)
 * - JSON detection (optional error state or graceful code block)
 * - Consistent styling with prose classes
 * - XSS protection via DOMPurify
 */
export function MarkdownRenderer({
  content,
  className = "",
  errorOnJson = false,
}: MarkdownRendererProps) {
  // Memoize processing for performance
  const { processedHtml, isJson } = useMemo(() => {
    if (!content) {
      return { processedHtml: "", isJson: false };
    }

    const jsonDetected = isJsonContent(content);

    if (jsonDetected && errorOnJson) {
      // Return empty - will render error state
      return { processedHtml: "", isJson: true };
    }

    if (jsonDetected) {
      // Wrap JSON in code block for readability
      console.warn(
        "[MarkdownRenderer] Content is JSON - wrapping in code block",
      );
      const jsonHtml = renderMarkdown(`\`\`\`json\n${content}\n\`\`\``);
      return { processedHtml: jsonHtml, isJson: true };
    }

    const processed = processContent(content);
    const html = renderMarkdown(processed);
    return { processedHtml: html, isJson: false };
  }, [content, errorOnJson]);

  // Empty content - render nothing
  if (!content) {
    return null;
  }

  // JSON error state
  if (isJson && errorOnJson) {
    return (
      <div className="border-2 border-red-500 p-3 rounded bg-red-950/50">
        <div className="text-red-400 font-bold text-sm mb-2">
          DATA ERROR: JSON logged instead of markdown
        </div>
        <pre className="text-xs text-red-300 overflow-auto whitespace-pre-wrap max-h-40">
          {content.substring(0, 500)}
          {content.length > 500 ? "..." : ""}
        </pre>
      </div>
    );
  }

  // Normal markdown rendering
  return (
    <div
      className={`prose prose-sm prose-gray dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}

/**
 * Pre-configured variant for conversation timeline
 */
export function TimelineMarkdownRenderer({
  content,
  className = "",
}: Omit<MarkdownRendererProps, "errorOnJson">) {
  return (
    <MarkdownRenderer
      content={content}
      className={`text-gray-700 dark:text-gray-300 [&_ul]:space-y-1 [&_li]:ml-4 [&_li]:list-disc [&_code]:font-mono [&_code]:bg-gray-100 [&_code]:dark:bg-gray-700 [&_code]:px-1 [&_code]:rounded [&_strong]:text-gray-900 [&_strong]:dark:text-gray-100 ${className}`}
      errorOnJson={false}
    />
  );
}
