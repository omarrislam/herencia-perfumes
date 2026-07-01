// apps/web/src/pages/admin/AdminBanners.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BannerDTO, BannerInput } from '@herencia/shared';
import { BANNER_PLACEMENT } from '@herencia/shared';
import {
  adminFetchBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  uploadImage,
} from '../../features/admin/adminClient';
import { ApiError } from '../../lib/api';

type BannerForm = {
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  placement: (typeof BANNER_PLACEMENT)[number];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  order: number;
};

const emptyForm = (): BannerForm => ({
  title: '',
  subtitle: '',
  image: '',
  ctaText: '',
  ctaLink: '',
  placement: 'home_hero',
  startsAt: '',
  endsAt: '',
  isActive: true,
  order: 0,
});

function formToInput(form: BannerForm): BannerInput {
  return {
    title: form.title,
    subtitle: form.subtitle || undefined,
    image: form.image,
    ctaText: form.ctaText || undefined,
    ctaLink: form.ctaLink || undefined,
    placement: form.placement,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    isActive: form.isActive,
    order: form.order,
  };
}

function bannerToForm(b: BannerDTO): BannerForm {
  // Convert ISO datetime → datetime-local string (strip seconds/ms for the input)
  const toLocal = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    // Adjust for local timezone so the prefilled value matches local time (not UTC)
    const offsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
  };
  return {
    title: b.title,
    subtitle: b.subtitle ?? '',
    image: b.image,
    ctaText: b.ctaText ?? '',
    ctaLink: b.ctaLink ?? '',
    placement: b.placement,
    startsAt: toLocal(b.startsAt),
    endsAt: toLocal(b.endsAt),
    isActive: b.isActive,
    order: b.order,
  };
}

function BannerFormPanel({
  initial,
  onSubmit,
  onCancel,
  isPending,
  error,
}: {
  initial: BannerForm;
  onSubmit: (input: BannerInput) => void;
  onCancel: () => void;
  isPending: boolean;
  error: Error | null;
}) {
  const [form, setForm] = useState<BannerForm>(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const setField = <K extends keyof BannerForm>(k: K, v: BannerForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const publicId = await uploadImage(file);
      setField('image', publicId);
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
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-surface p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="font-body text-sm text-muted">Title *</span>
          <input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Banner title"
            required
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">Subtitle</span>
          <input
            value={form.subtitle}
            onChange={(e) => setField('subtitle', e.target.value)}
            placeholder="Optional subtitle"
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">Placement *</span>
          <select
            value={form.placement}
            onChange={(e) => setField('placement', e.target.value as BannerForm['placement'])}
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          >
            {BANNER_PLACEMENT.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">Order</span>
          <input
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => setField('order', Number(e.target.value))}
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">CTA text</span>
          <input
            value={form.ctaText}
            onChange={(e) => setField('ctaText', e.target.value)}
            placeholder="e.g. Shop now"
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">CTA link</span>
          <input
            value={form.ctaLink}
            onChange={(e) => setField('ctaLink', e.target.value)}
            placeholder="/products"
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">Starts at</span>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setField('startsAt', e.target.value)}
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">Ends at</span>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setField('endsAt', e.target.value)}
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
      </div>

      <label className="block">
        <span className="font-body text-sm text-muted">Image *</span>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void handleImageUpload(e)}
            disabled={uploading}
            className="font-body text-sm text-content"
          />
          {form.image && (
            <span className="font-body text-xs text-muted truncate max-w-xs">{form.image}</span>
          )}
          {uploading && <span className="font-body text-xs text-muted">Uploading…</span>}
        </div>
        {uploadError && <p className="mt-1 font-body text-xs text-red-500">{uploadError}</p>}
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setField('isActive', e.target.checked)}
          className="h-4 w-4"
        />
        <span className="font-body text-sm text-content">Active</span>
      </label>

      {error && (
        <p className="font-body text-sm text-red-500">
          {error instanceof ApiError ? `Error ${error.status}: ${error.message}` : error.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || uploading || !form.image}
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

export default function AdminBanners() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BannerDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: banners, isLoading, isError } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: adminFetchBanners,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-banners'] });

  const createMut = useMutation({
    mutationFn: (input: BannerInput) => adminCreateBanner(input),
    onSuccess: () => { setCreating(false); invalidate(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: BannerInput }) => adminUpdateBanner(id, input),
    onSuccess: () => { setEditing(null); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteBanner(id),
    onSuccess: invalidate,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-content">Banners</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded bg-maroon px-4 py-2 font-body text-sm text-cream"
          >
            + New banner
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-6">
          <BannerFormPanel
            initial={emptyForm()}
            onSubmit={(input) => createMut.mutate(input)}
            onCancel={() => setCreating(false)}
            isPending={createMut.isPending}
            error={createMut.isError ? (createMut.error as Error) : null}
          />
        </div>
      )}

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-red-500">Failed to load banners.</p>}

      {banners && banners.length === 0 && !creating && (
        <p className="font-body text-muted">No banners yet.</p>
      )}

      <div className="space-y-4">
        {banners?.map((banner) => (
          <div key={banner.id} className="rounded-lg border border-line p-4">
            {editing?.id === banner.id ? (
              <BannerFormPanel
                initial={bannerToForm(banner)}
                onSubmit={(input) => updateMut.mutate({ id: banner.id, input })}
                onCancel={() => setEditing(null)}
                isPending={updateMut.isPending}
                error={updateMut.isError ? (updateMut.error as Error) : null}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-display text-lg text-content">{banner.title}</p>
                  {banner.subtitle && (
                    <p className="font-body text-sm text-muted">{banner.subtitle}</p>
                  )}
                  <div className="flex flex-wrap gap-3 font-body text-xs text-muted">
                    <span>Placement: <strong className="text-content">{banner.placement}</strong></span>
                    <span>Order: <strong className="text-content">{banner.order}</strong></span>
                    <span>
                      Active:{' '}
                      <strong className={banner.isActive ? 'text-green-600' : 'text-red-500'}>
                        {banner.isActive ? 'Yes' : 'No'}
                      </strong>
                    </span>
                    {banner.startsAt && (
                      <span>Starts: <strong className="text-content">{new Date(banner.startsAt).toLocaleString()}</strong></span>
                    )}
                    {banner.endsAt && (
                      <span>Ends: <strong className="text-content">{new Date(banner.endsAt).toLocaleString()}</strong></span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditing(banner)}
                    className="font-body text-sm text-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${banner.title}"?`)) {
                        deleteMut.mutate(banner.id);
                      }
                    }}
                    className="font-body text-sm text-red-500 hover:underline"
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
        <p className="mt-3 font-body text-sm text-red-500">Delete failed.</p>
      )}
    </div>
  );
}
