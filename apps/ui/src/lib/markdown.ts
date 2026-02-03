import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Render markdown to sanitized HTML
 *
 * Handles:
 * - GitHub Flavored Markdown
 * - Line breaks (breaks: true)
 * - XSS protection via DOMPurify
 *
 * Note: Escaped newlines (\\n) should be normalized BEFORE calling this function.
 * Use the MarkdownRenderer component which handles this automatically.
 */
export function renderMarkdown(md?: string | null): string {
  if (!md) return "";

  const config: Config = {
    ALLOWED_ATTR: ["href", "title", "target", "rel", "class"],
    ALLOWED_TAGS: [
      "a",
      "p",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
      "blockquote",
      "br",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
    ],
  };

  const raw = marked.parse(md) as string;
  return DOMPurify.sanitize(raw, config);
}

/**
 * Normalize markdown content by fixing common data quality issues
 * Use this when content may have escaped newlines
 */
export function normalizeMarkdown(md?: string | null): string {
  if (!md) return "";

  // Fix escaped newlines (data quality issue from some sources)
  return md.replace(/\\n/g, "\n");
}
