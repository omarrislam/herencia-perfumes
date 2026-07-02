import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateSettingsInput, HomeSections } from '@herencia/shared';
import { fetchSettings } from '../../lib/api';
import { adminUpdateSettings, uploadImage } from '../../features/admin/adminClient';
import { cld } from '../../lib/cloudinary';
import { ApiError } from '../../lib/api';

type HeroForm = { title: string; subtitle: string; ctaText: string; ctaLink: string; image: string };
const SECTION_LABELS: { key: keyof HomeSections; label: string; hint: string }[] = [
  { key: 'hero', label: 'Hero', hint: 'Main banner at the top' },
  { key: 'values', label: 'Values strip', hint: 'Small-batch / COD / free shipping' },
  { key: 'featured', label: 'Featured scents', hint: 'Grid of featured products' },
  { key: 'promo', label: 'Promo banner', hint: 'The cinematic home-hero banner' },
  { key: 'quiz', label: 'Quiz CTA', hint: '“Find your signature scent” band' },
];

export default function AdminHome() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  const [hero, setHero] = useState<HeroForm>({ title: '', subtitle: '', ctaText: '', ctaLink: '', image: '' });
  const [sections, setSections] = useState<HomeSections>({ hero: true, values: true, featured: true, promo: true, quiz: true });
  const [instapay, setInstapay] = useState<{ enabled: boolean; handle: string; qrImage: string }>({ enabled: false, handle: '', qrImage: '' });
  const [uploading, setUploading] = useState<'hero' | 'qr' | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setHero({ title: s.hero.title, subtitle: s.hero.subtitle, ctaText: s.hero.ctaText, ctaLink: s.hero.ctaLink, image: s.hero.image });
    setSections(s.homeSections);
    setInstapay({ enabled: s.instapay.enabled, handle: s.instapay.handle ?? '', qrImage: s.instapay.qrImage ?? '' });
  }, [settings.data]);

  const mut = useMutation({
    mutationFn: (input: UpdateSettingsInput) => adminUpdateSettings(input),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const pickImage = async (which: 'hero' | 'qr', file?: File) => {
    if (!file) return;
    setUploading(which);
    setUploadErr(null);
    try {
      const publicId = await uploadImage(file);
      if (which === 'hero') setHero((h) => ({ ...h, image: publicId }));
      else setInstapay((i) => ({ ...i, qrImage: publicId }));
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const save = () => {
    mut.mutate({
      hero,
      homeSections: sections,
      instapay: {
        enabled: instapay.enabled,
        handle: instapay.handle || undefined,
        qrImage: instapay.qrImage || undefined,
      },
    });
  };

  if (settings.isLoading) return <p className="font-body text-muted">Loading…</p>;
  if (settings.isError) return <p className="font-body text-danger">Failed to load settings.</p>;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-display text-2xl text-content">Home page</h1>

      {/* Hero */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">Hero</h2>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Title</span>
          <input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Subtitle</span>
          <input value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} className="field-lux" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Button text</span>
            <input value={hero.ctaText} onChange={(e) => setHero({ ...hero, ctaText: e.target.value })} className="field-lux" />
          </label>
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Button link</span>
            <input value={hero.ctaLink} onChange={(e) => setHero({ ...hero, ctaLink: e.target.value })} className="field-lux" />
          </label>
        </div>
        <div>
          <span className="mb-1 block font-body text-sm text-muted">Hero image</span>
          <div className="flex items-center gap-3">
            {hero.image && <img src={cld(hero.image, { w: 160 })} alt="" className="h-16 w-24 rounded object-cover" />}
            <input type="file" accept="image/*" onChange={(e) => void pickImage('hero', e.target.files?.[0])} disabled={uploading === 'hero'} className="font-body text-sm text-content" />
            {uploading === 'hero' && <span className="font-body text-xs text-muted">Uploading…</span>}
          </div>
        </div>
      </section>

      {/* Section toggles */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-3">
        <h2 className="font-display text-lg text-content">Sections</h2>
        <p className="font-body text-sm text-muted">Show or hide each block on the home page.</p>
        {SECTION_LABELS.map(({ key, label, hint }) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5">
            <span>
              <span className="font-body text-sm text-content">{label}</span>
              <span className="block font-body text-xs text-muted">{hint}</span>
            </span>
            <input type="checkbox" checked={sections[key]} onChange={(e) => setSections({ ...sections, [key]: e.target.checked })} className="h-4 w-4" />
          </label>
        ))}
      </section>

      {/* InstaPay */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">InstaPay</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={instapay.enabled} onChange={(e) => setInstapay({ ...instapay, enabled: e.target.checked })} className="h-4 w-4" />
          <span className="font-body text-sm text-content">Offer InstaPay at checkout</span>
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">InstaPay handle / address</span>
          <input value={instapay.handle} onChange={(e) => setInstapay({ ...instapay, handle: e.target.value })} placeholder="omarislamelsady@instapay" className="field-lux" />
        </label>
        <div>
          <span className="mb-1 block font-body text-sm text-muted">QR image</span>
          <div className="flex items-center gap-3">
            {instapay.qrImage && <img src={cld(instapay.qrImage, { w: 160 })} alt="" className="h-20 w-20 rounded object-cover" />}
            <input type="file" accept="image/*" onChange={(e) => void pickImage('qr', e.target.files?.[0])} disabled={uploading === 'qr'} className="font-body text-sm text-content" />
            {uploading === 'qr' && <span className="font-body text-xs text-muted">Uploading…</span>}
          </div>
        </div>
      </section>

      {uploadErr && <p className="font-body text-sm text-danger">{uploadErr}</p>}
      {mut.isError && (
        <p className="font-body text-sm text-danger">
          {mut.error instanceof ApiError ? `Error ${mut.error.status}: ${mut.error.message}` : 'Save failed.'}
        </p>
      )}
      {saved && <p className="font-body text-sm text-success">Saved.</p>}

      <button type="button" onClick={save} disabled={mut.isPending || uploading !== null} className="btn-lux disabled:opacity-50">
        {mut.isPending ? 'Saving…' : 'Save home page'}
      </button>
    </div>
  );
}
