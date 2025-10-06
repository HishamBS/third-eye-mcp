import DOMPurify from 'dompurify';
import type { Config } from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(md?: string | null): string {
  if (!md) return '';
  const raw = marked.parse(md) as string;
  const config: Config = {
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOWED_TAGS: ['a', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  };
  return DOMPurify.sanitize(raw, config);
}
