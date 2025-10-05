import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../markdown';

describe('renderMarkdown', () => {
  it('sanitises scripts from markdown', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script>');
    expect(html).not.toContain('script');
    expect(html).toContain('Hello');
  });
});
