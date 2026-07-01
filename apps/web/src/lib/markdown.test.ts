import { describe, it, expect } from 'vitest';
import { renderMarkdownSafe } from './markdown';

describe('renderMarkdownSafe', () => {
  it('renders bold and headings', () => {
    const html = renderMarkdownSafe('# Title\n\nHello **world**');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>world</strong>');
  });
  it('strips script tags and event handlers', () => {
    const html = renderMarkdownSafe('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });
  it('keeps links but drops javascript: URLs', () => {
    const html = renderMarkdownSafe('[ok](https://x.com) [bad](javascript:alert(1))');
    expect(html).toContain('href="https://x.com"');
    expect(html).not.toContain('javascript:');
  });
});
