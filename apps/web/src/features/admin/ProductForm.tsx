// apps/web/src/features/admin/ProductForm.tsx
import { useForm, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminProductInput, ProductDTO, ScentFamilyDTO } from '@herencia/shared';
import { GENDER, CONCENTRATION, PRODUCT_TYPE } from '@herencia/shared';
import { uploadImage, adminCreateNoteIcon } from './adminClient';
import { fetchNoteIcons } from '../../lib/api';
import { NOTE_LIBRARY, builtinNoteImage } from '../../lib/noteLibrary';
import { cld } from '../../lib/cloudinary';

function toFormDefaults(p?: ProductDTO): AdminProductInput {
  if (!p) {
    return {
      name: '',
      type: 'perfume',
      shortDesc: '',
      description: '',
      images: [],
      sizes: [{ label: '50ml', price: 0, stock: 0 }],
      scentFamily: '',
      notes: { top: [], heart: [], base: [] },
      gender: 'unisex',
      concentration: 'EDP',
      isFeatured: false,
      sampleStock: 0,
      isActive: true,
      seo: {},
    };
  }
  return {
    name: p.name,
    type: p.type,
    shortDesc: p.shortDesc,
    description: p.description,
    images: p.images,
    sizes: p.sizes.map((s) => ({
      label: s.label,
      price: s.price,
      compareAtPrice: s.compareAtPrice,
      stock: s.stock,
    })),
    scentFamily: p.scentFamily?.id ?? '',
    notes: p.notes,
    gender: p.gender,
    concentration: p.concentration,
    isFeatured: p.isFeatured,
    sampleStock: p.sampleStock,
    isActive: p.isActive,
    seo: p.seo,
    bundleItems: p.bundleItems?.map((b) => ({
      product: typeof b.product === 'object' ? (b.product as ProductDTO).id : b.product,
      qty: b.qty,
    })),
  };
}

export function ProductForm({
  families,
  initial,
  onSubmit,
  submitting,
}: {
  families: ScentFamilyDTO[];
  initial?: ProductDTO;
  onSubmit: (data: AdminProductInput) => void;
  submitting: boolean;
}) {
  const { register, control, handleSubmit, setValue, watch } = useForm<AdminProductInput>({
    defaultValues: toFormDefaults(initial),
  });
  const sizes = useFieldArray({ control, name: 'sizes' });
  const images = watch('images');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notesSel, setNotesSel] = useState<{ top: string[]; heart: string[]; base: string[] }>({
    top: initial?.notes.top ?? [],
    heart: initial?.notes.heart ?? [],
    base: initial?.notes.base ?? [],
  });

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const publicId = await uploadImage(file);
      setValue('images', [...(images ?? []), publicId]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed — try again.');
    } finally {
      setUploading(false);
    }
  }

  const removeImage = (i: number) =>
    setValue('images', (images ?? []).filter((_, idx) => idx !== i));
  const makePrimary = (i: number) => {
    const arr = [...(images ?? [])];
    const [x] = arr.splice(i, 1);
    if (x) arr.unshift(x);
    setValue('images', arr);
  };

  const submitWithNotes = (data: AdminProductInput) => onSubmit({ ...data, notes: notesSel });

  return (
    <form onSubmit={handleSubmit(submitWithNotes)} className="space-y-4">
      <label className="block">
        <span className="mb-1 block font-body text-xs text-muted">Product name</span>
        <input
          {...register('name')}
          placeholder="Name"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block font-body text-xs text-muted">Type</span>
          <select
            {...register('type')}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
          >
            {PRODUCT_TYPE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-body text-xs text-muted">Scent family</span>
          <select
            {...register('scentFamily')}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
          >
            <option value="">Select scent family</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-body text-xs text-muted">Gender</span>
          <select
            {...register('gender')}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
          >
            {GENDER.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-body text-xs text-muted">Concentration</span>
          <select
            {...register('concentration')}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
          >
            {CONCENTRATION.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-body text-xs text-muted">Short description</span>
        <input
          {...register('shortDesc')}
          placeholder="Short description"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-body text-xs text-muted">Full description</span>
        <textarea
          {...register('description')}
          placeholder="Full description"
          rows={4}
          className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
        />
      </label>

      <div>
        <p className="mb-2 font-display text-content">Sizes</p>
        {sizes.fields.map((field, i) => (
          <div key={field.id} className="mb-2 grid grid-cols-4 gap-2">
            <label>
              <span className="mb-1 block font-body text-xs text-muted">Size label</span>
              <input
                {...register(`sizes.${i}.label`)}
                placeholder="50ml"
                className="w-full rounded-md border border-line bg-bg px-2 py-1 font-body text-content"
              />
            </label>
            <label>
              <span className="mb-1 block font-body text-xs text-muted">Price</span>
              <input
                type="number"
                step="0.01"
                {...register(`sizes.${i}.price`, { valueAsNumber: true })}
                placeholder="Price"
                className="w-full rounded-md border border-line bg-bg px-2 py-1 font-body text-content"
              />
            </label>
            <label>
              <span className="mb-1 block font-body text-xs text-muted">Stock</span>
              <input
                type="number"
                {...register(`sizes.${i}.stock`, { valueAsNumber: true })}
                placeholder="Stock"
                className="w-full rounded-md border border-line bg-bg px-2 py-1 font-body text-content"
              />
            </label>
            <button
              type="button"
              onClick={() => sizes.remove(i)}
              className="rounded-md border border-line px-2 py-1 font-body text-sm text-muted"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => sizes.append({ label: '', price: 0, stock: 0 })}
          className="rounded-md border border-gold px-3 py-1 font-body text-sm text-content"
        >
          Add size
        </button>
      </div>

      <NotesEditor value={notesSel} onChange={setNotesSel} />

      <div>
        <p className="mb-2 font-display text-content">
          Images <span className="font-body text-xs text-muted">(the first image is the main one shown on cards)</span>
        </p>
        <div className="mb-3 flex flex-wrap gap-3">
          {(images ?? []).map((id, i) => (
            <div key={id} className="relative">
              <img
                src={cld(id, { w: 160 })}
                alt=""
                className={`h-20 w-20 rounded-md object-cover ${i === 0 ? 'ring-2 ring-accent' : 'border border-hairline'}`}
              />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-espresso/85 px-1 py-0.5 text-[9px] font-medium text-cream">Main</span>
              )}
              <div className="absolute -right-1.5 -top-1.5 flex gap-1">
                {i !== 0 && (
                  <button type="button" onClick={() => makePrimary(i)} title="Make main image"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-surface">★</button>
                )}
                <button type="button" onClick={() => removeImage(i)} title="Remove"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] text-white">✕</button>
              </div>
            </div>
          ))}
        </div>
        <label>
          <span className="mb-1 block font-body text-xs text-muted">Upload image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              void onPickImage(e.target.files?.[0]);
            }}
          />
        </label>
        {uploading ? <span className="ml-2 font-body text-sm text-muted">Uploading…</span> : null}
        {uploadError ? <p className="font-body text-sm text-danger">{uploadError}</p> : null}
      </div>

      <label className="flex items-center gap-2 font-body text-content">
        <input type="checkbox" {...register('isFeatured')} />
        Featured
      </label>
      <label className="flex items-center gap-2 font-body text-content">
        <input type="checkbox" {...register('isActive')} />
        Active
      </label>

      {watch('type') === 'perfume' && (
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Sample stock (0 = samples not offered)</span>
          <input type="number" min="0" step="1" {...register('sampleStock', { valueAsNumber: true })} className="field-lux" />
        </label>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-maroon px-6 py-2 font-body text-cream disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save product'}
      </button>
    </form>
  );
}

type NotesValue = { top: string[]; heart: string[]; base: string[] };
const TIERS = [
  ['top', 'Top notes'],
  ['heart', 'Heart notes'],
  ['base', 'Base notes'],
] as const;

// Per-tier note picker: chips with real icons, type-ahead suggestions from the
// built-in library + custom icons, and an inline uploader for new note icons.
function NotesEditor({ value, onChange }: { value: NotesValue; onChange: (v: NotesValue) => void }) {
  const qc = useQueryClient();
  const icons = useQuery({ queryKey: ['note-icons'], queryFn: fetchNoteIcons });
  const custom = new Map((icons.data ?? []).map((i) => [i.name.toLowerCase(), i.image]));
  const [drafts, setDrafts] = useState<Record<(typeof TIERS)[number][0], string>>({ top: '', heart: '', base: '' });
  const [iconName, setIconName] = useState('');
  const [iconBusy, setIconBusy] = useState(false);
  const [iconMsg, setIconMsg] = useState<string | null>(null);

  const imageFor = (note: string): string | null => {
    const publicId = custom.get(note.trim().toLowerCase());
    if (publicId) {
      const url = cld(publicId, { w: 96 });
      if (/^https?:\/\//.test(url)) return url;
    }
    return builtinNoteImage(note);
  };

  const addNote = (tier: keyof NotesValue) => {
    const name = drafts[tier].trim();
    if (!name) return;
    if (!value[tier].some((n) => n.toLowerCase() === name.toLowerCase())) {
      onChange({ ...value, [tier]: [...value[tier], name] });
    }
    setDrafts((d) => ({ ...d, [tier]: '' }));
  };
  const removeNote = (tier: keyof NotesValue, name: string) =>
    onChange({ ...value, [tier]: value[tier].filter((n) => n !== name) });

  const uploadIcon = async (file: File | undefined) => {
    const name = iconName.trim();
    if (!file || !name) return;
    setIconBusy(true);
    setIconMsg(null);
    try {
      const publicId = await uploadImage(file);
      await adminCreateNoteIcon({ name, image: publicId });
      await qc.invalidateQueries({ queryKey: ['note-icons'] });
      setIconMsg(`Icon saved for “${name}”.`);
      setIconName('');
    } catch (err) {
      setIconMsg(err instanceof Error ? err.message : 'Icon upload failed');
    } finally {
      setIconBusy(false);
    }
  };

  const suggestions = [
    ...NOTE_LIBRARY.map((n) => n.name),
    ...(icons.data ?? []).map((i) => i.name),
  ].sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <p className="mb-2 font-display text-content">
        Fragrance notes <span className="font-body text-xs text-muted">(shown as the pyramid on the product page)</span>
      </p>
      <datalist id="note-suggestions">
        {suggestions.map((n) => <option key={n} value={n} />)}
      </datalist>
      <div className="space-y-3">
        {TIERS.map(([tier, label]) => (
          <div key={tier}>
            <span className="mb-1 block font-body text-xs text-muted">{label}</span>
            {value[tier].length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {value[tier].map((note) => {
                  const img = imageFor(note);
                  return (
                    <span key={note} className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface py-1 pl-1 pr-2 font-body text-xs text-content">
                      {img ? (
                        <img src={img} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2 font-display text-[11px] text-accent">
                          {note.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {note}
                      <button type="button" onClick={() => removeNote(tier, note)} aria-label={`Remove ${note}`} className="text-muted hover:text-danger">✕</button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={drafts[tier]}
                onChange={(e) => setDrafts((d) => ({ ...d, [tier]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addNote(tier);
                  }
                }}
                list="note-suggestions"
                placeholder="Type a note, e.g. Bergamot"
                className="w-full rounded-md border border-line bg-bg px-3 py-1.5 font-body text-sm text-content"
              />
              <button type="button" onClick={() => addNote(tier)} className="shrink-0 rounded-md border border-gold px-3 py-1 font-body text-sm text-content">
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-hairline bg-surface p-3">
        <span className="mb-1 block font-body text-xs text-muted">
          New note icon — for notes without a picture (uploading again replaces the icon)
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={iconName}
            onChange={(e) => setIconName(e.target.value)}
            placeholder="Note name, e.g. Blue Lotus"
            className="rounded-md border border-line bg-bg px-3 py-1.5 font-body text-sm text-content"
          />
          <input
            type="file"
            accept="image/*"
            disabled={iconBusy || !iconName.trim()}
            onChange={(e) => {
              void uploadIcon(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="font-body text-sm text-content"
          />
          {iconBusy && <span className="font-body text-xs text-muted">Uploading…</span>}
        </div>
        {iconMsg && <p className="mt-1 font-body text-xs text-muted">{iconMsg}</p>}
      </div>
    </div>
  );
}
