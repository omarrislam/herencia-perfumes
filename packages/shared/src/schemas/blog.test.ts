import { describe, it, expect } from 'vitest';
import { blogPostSchema } from './blog';

describe('blogPostSchema', () => {
  it('accepts a valid post', () => {
    expect(blogPostSchema.safeParse({
      title: 'Notes on Oud', excerpt: 'A primer', body: '# Oud', coverImage: 'blog/oud', tags: ['oud'], isPublished: true,
    }).success).toBe(true);
  });
  it('defaults tags to [] and isPublished to false', () => {
    const r = blogPostSchema.safeParse({ title: 'T', excerpt: 'e', body: 'b', coverImage: 'c' });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.tags).toEqual([]); expect(r.data.isPublished).toBe(false); }
  });
  it('rejects a missing title', () => {
    expect(blogPostSchema.safeParse({ excerpt: 'e', body: 'b', coverImage: 'c' }).success).toBe(false);
  });
});
