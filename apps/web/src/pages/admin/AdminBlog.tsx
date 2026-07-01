import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BlogPostDTO, BlogPostInput } from '@herencia/shared';
import {
  adminFetchBlog,
  adminCreateBlogPost,
  adminUpdateBlogPost,
  adminDeleteBlogPost,
  uploadImage,
} from '../../features/admin/adminClient';
import { ApiError } from '../../lib/api';

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  tags: string;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
};

const emptyForm = (): BlogForm => ({
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  coverImage: '',
  tags: '',
  isPublished: false,
  seoTitle: '',
  seoDescription: '',
});

function postToForm(post: BlogPostDTO): BlogForm {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body: post.body,
    coverImage: post.coverImage,
    tags: post.tags.join(', '),
    isPublished: post.isPublished,
    seoTitle: post.seo.title ?? '',
    seoDescription: post.seo.description ?? '',
  };
}

function formToInput(form: BlogForm): BlogPostInput {
  return {
    title: form.title,
    slug: form.slug || undefined,
    excerpt: form.excerpt,
    body: form.body,
    coverImage: form.coverImage,
    tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    isPublished: form.isPublished,
    seo: {
      title: form.seoTitle || undefined,
      description: form.seoDescription || undefined,
    },
  };
}

function BlogFormPanel({
  initial,
  onSubmit,
  onCancel,
  isPending,
  error,
}: {
  initial: BlogForm;
  onSubmit: (input: BlogPostInput) => void;
  onCancel: () => void;
  isPending: boolean;
  error: Error | null;
}) {
  const [form, setForm] = useState<BlogForm>(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const setField = <K extends keyof BlogForm>(k: K, v: BlogForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const publicId = await uploadImage(file);
      setField('coverImage', publicId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formToInput(form));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="font-body text-sm text-muted">Title *</span>
          <input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Post title"
            required
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">Slug (optional)</span>
          <input
            value={form.slug}
            onChange={(e) => setField('slug', e.target.value)}
            placeholder="auto-generated if blank"
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="font-body text-sm text-muted">Excerpt *</span>
          <input
            value={form.excerpt}
            onChange={(e) => setField('excerpt', e.target.value)}
            placeholder="Short summary"
            required
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">Tags (comma-separated)</span>
          <input
            value={form.tags}
            onChange={(e) => setField('tags', e.target.value)}
            placeholder="oud, oriental, review"
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">SEO title</span>
          <input
            value={form.seoTitle}
            onChange={(e) => setField('seoTitle', e.target.value)}
            placeholder="Optional SEO title"
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="font-body text-sm text-muted">SEO description</span>
          <input
            value={form.seoDescription}
            onChange={(e) => setField('seoDescription', e.target.value)}
            placeholder="Optional SEO description"
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
      </div>

      <label className="block">
        <span className="font-body text-sm text-muted">Body *</span>
        <textarea
          value={form.body}
          onChange={(e) => setField('body', e.target.value)}
          placeholder="Post content (blank lines become paragraphs)"
          required
          rows={10}
          className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
        />
      </label>

      <label className="block">
        <span className="font-body text-sm text-muted">Cover image *</span>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void handleImageUpload(e)}
            disabled={uploading}
            className="font-body text-sm text-content"
          />
          {form.coverImage && (
            <span className="max-w-xs truncate font-body text-xs text-muted">{form.coverImage}</span>
          )}
          {uploading && <span className="font-body text-xs text-muted">Uploading…</span>}
        </div>
        {uploadError && <p className="mt-1 font-body text-xs text-danger">{uploadError}</p>}
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) => setField('isPublished', e.target.checked)}
          className="h-4 w-4"
        />
        <span className="font-body text-sm text-content">Published</span>
      </label>

      {error && (
        <p className="font-body text-sm text-danger">
          {error instanceof ApiError ? `Error ${error.status}: ${error.message}` : error.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || uploading || !form.coverImage}
          className="rounded bg-maroon px-4 py-2 font-body text-cream disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-line px-4 py-2 font-body text-muted hover:text-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminBlog() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BlogPostDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-blog'],
    queryFn: adminFetchBlog,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-blog'] });

  const createMut = useMutation({
    mutationFn: (input: BlogPostInput) => adminCreateBlogPost(input),
    onSuccess: () => { setCreating(false); invalidate(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: BlogPostInput }) => adminUpdateBlogPost(id, input),
    onSuccess: () => { setEditing(null); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteBlogPost(id),
    onSuccess: invalidate,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-content">Blog</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded bg-maroon px-4 py-2 font-body text-sm text-cream"
          >
            + New post
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-6">
          <BlogFormPanel
            initial={emptyForm()}
            onSubmit={(input) => createMut.mutate(input)}
            onCancel={() => setCreating(false)}
            isPending={createMut.isPending}
            error={createMut.isError ? (createMut.error as Error) : null}
          />
        </div>
      )}

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-danger">Failed to load posts.</p>}

      {data && data.items.length === 0 && !creating && (
        <p className="font-body text-muted">No posts yet.</p>
      )}

      <div className="space-y-4">
        {data?.items.map((post) => (
          <div key={post.id} className="rounded-lg border border-line p-4">
            {editing?.id === post.id ? (
              <BlogFormPanel
                initial={postToForm(post)}
                onSubmit={(input) => updateMut.mutate({ id: post.id, input })}
                onCancel={() => setEditing(null)}
                isPending={updateMut.isPending}
                error={updateMut.isError ? (updateMut.error as Error) : null}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-display text-lg text-content">{post.title}</p>
                  <div className="flex flex-wrap gap-3 font-body text-xs text-muted">
                    <span>
                      Status:{' '}
                      <strong className={post.isPublished ? 'text-success' : 'text-warning'}>
                        {post.isPublished ? 'Published' : 'Draft'}
                      </strong>
                    </span>
                    <span>Slug: <strong className="text-content">{post.slug}</strong></span>
                    {post.tags.length > 0 && (
                      <span>Tags: <strong className="text-content">{post.tags.join(', ')}</strong></span>
                    )}
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => setEditing(post)}
                    className="font-body text-sm text-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${post.title}"?`)) {
                        deleteMut.mutate(post.id);
                      }
                    }}
                    className="font-body text-sm text-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {deleteMut.isError && (
        <p className="mt-3 font-body text-sm text-danger">Delete failed.</p>
      )}
    </div>
  );
}
