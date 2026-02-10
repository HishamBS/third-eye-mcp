import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import { marked, type MarkedExtension } from "marked";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";

// Register selective languages to keep bundle small
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);

// Custom renderer for syntax-highlighted code blocks
const highlightExtension: MarkedExtension = {
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : null;
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      const langClass = language ? `language-${language}` : "";
      return `<pre><code class="hljs ${langClass}">${highlighted}</code></pre>`;
    },
  },
};

marked.use({
  gfm: true,
  breaks: true,
});

marked.use(highlightExtension);

/**
 * Render markdown to sanitized HTML
 *
 * Handles:
 * - GitHub Flavored Markdown
 * - Line breaks (breaks: true)
 * - Syntax-highlighted code blocks via highlight.js
 * - XSS protection via DOMPurify
 *
 * Note: Escaped newlines (\\n) should be normalized BEFORE calling this function.
 * Use the MarkdownRenderer component which handles this automatically.
 */
export function renderMarkdown(md?: string | null): string {
  if (!md) return "";

  const config: Config = {
    ALLOWED_ATTR: [
      "href",
      "title",
      "target",
      "rel",
      "class",
      "style",
      "type",
      "checked",
      "disabled",
    ],
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
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
      "del",
      "sup",
      "sub",
      "details",
      "summary",
      "input",
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
