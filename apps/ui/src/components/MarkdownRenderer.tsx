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
      className={`prose prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-brand-foreground [&_h1]:mb-3 [&_h1]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-brand-foreground [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-brand-foreground [&_h3]:mb-1.5 [&_h3]:mt-2 [&_p]:text-base [&_p]:text-brand-foreground/80 [&_p]:leading-relaxed [&_p]:mb-2 [&_strong]:text-brand-accent [&_strong]:font-semibold [&_em]:text-brand-foreground/70 [&_em]:italic [&_a]:text-brand-primary [&_a]:underline [&_a]:underline-offset-2 [&_ul]:space-y-1 [&_ul]:my-2 [&_ol]:space-y-1 [&_ol]:my-2 [&_li]:text-base [&_li]:text-brand-foreground/80 [&_li]:ml-4 [&_ul>li]:list-disc [&_ol>li]:list-decimal [&_blockquote]:border-l-2 [&_blockquote]:border-brand-primary/40 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:my-2 [&_blockquote]:bg-brand-paperElev/50 [&_blockquote]:rounded-r [&_code]:font-mono [&_code]:text-xs [&_code]:bg-brand-paperElev [&_code]:border [&_code]:border-brand-outline/40 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-brand-ink [&_pre]:border [&_pre]:border-brand-outline/30 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:border-0 [&_pre_code]:p-0 [&_pre_code]:text-xs [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-brand-foreground [&_th]:bg-brand-paperElev [&_th]:px-3 [&_th]:py-2 [&_th]:border [&_th]:border-brand-outline/30 [&_td]:text-base [&_td]:text-brand-foreground/80 [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-brand-outline/20 [&_tr:nth-child(even)_td]:bg-brand-paperElev/30 [&_hr]:border-brand-outline/30 [&_hr]:my-4 ${className}`}
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
      className={`text-gray-700 dark:text-gray-300 ${className}`}
      errorOnJson={false}
    />
  );
}
