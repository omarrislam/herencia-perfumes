// apps/web/src/features/admin/ProductForm.tsx
import { useForm, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import type { AdminProductInput, ProductDTO, ScentFamilyDTO } from '@herencia/shared';
import { GENDER, CONCENTRATION, PRODUCT_TYPE } from '@herencia/shared';
import { uploadImage } from './adminClient';

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <label className="block">
        <span className="sr-only">Product name</span>
        <input
          {...register('name')}
          placeholder="Name"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="sr-only">Type</span>
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
          <span className="sr-only">Scent family</span>
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
          <span className="sr-only">Gender</span>
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
          <span className="sr-only">Concentration</span>
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
        <span className="sr-only">Short description</span>
        <input
          {...register('shortDesc')}
          placeholder="Short description"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
        />
      </label>

      <label className="block">
        <span className="sr-only">Full description</span>
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
              <span className="sr-only">Size label</span>
              <input
                {...register(`sizes.${i}.label`)}
                placeholder="50ml"
                className="w-full rounded-md border border-line bg-bg px-2 py-1 font-body text-content"
              />
            </label>
            <label>
              <span className="sr-only">Price</span>
              <input
                type="number"
                step="0.01"
                {...register(`sizes.${i}.price`, { valueAsNumber: true })}
                placeholder="Price"
                className="w-full rounded-md border border-line bg-bg px-2 py-1 font-body text-content"
              />
            </label>
            <label>
              <span className="sr-only">Stock</span>
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

      <div>
        <p className="mb-2 font-display text-content">Images</p>
        <div className="mb-2 flex flex-wrap gap-2 font-body text-xs text-muted">
          {(images ?? []).map((id) => (
            <span key={id} className="rounded bg-line/30 px-2 py-1">
              {id}
            </span>
          ))}
        </div>
        <label>
          <span className="sr-only">Upload image</span>
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
