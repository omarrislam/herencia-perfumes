import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BlogPost from './BlogPost';
import * as api from '../lib/api';

function wrap(slug: string) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/blog/${slug}`]}>
        <Routes><Route path="/blog/:slug" element={<BlogPost />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BlogPost', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('renders the post title and body', async () => {
    vi.spyOn(api, 'fetchBlogPost').mockResolvedValue({
      id: '1', title: 'Notes on Oud', slug: 'notes-on-oud', excerpt: 'A primer', body: 'Oud is deep and woody.',
      coverImage: 'blog/oud', tags: ['oud'], isPublished: true, seo: {}, createdAt: '2026-07-01T00:00:00Z',
    });
    render(wrap('notes-on-oud'));
    await waitFor(() => expect(screen.getByText('Notes on Oud')).toBeInTheDocument());
    expect(screen.getByText(/deep and woody/)).toBeInTheDocument();
  });
});
