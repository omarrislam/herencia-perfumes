import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

/** Parse markdown to HTML, then sanitize. Safe to pass to dangerouslySetInnerHTML. */
export function renderMarkdownSafe(md: string): string {
  const raw = marked.parse(md ?? '', { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
