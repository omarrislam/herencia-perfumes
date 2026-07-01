// apps/web/src/pages/admin/AdminProducts.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AdminProductInput, ProductDTO } from '@herencia/shared';
import { fetchProducts, fetchScentFamilies } from '../../lib/api';
import { adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '../../features/admin/adminClient';
import { ProductForm } from '../../features/admin/ProductForm';

export default function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const families = useQuery({ queryKey: ['scent-families'], queryFn: fetchScentFamilies });
  const products = useQuery({ queryKey: ['admin-products'], queryFn: () => fetchProducts({ limit: 48 }) });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-products'] });
    setEditing(null);
    setCreating(false);
  };
  const createMut = useMutation({
    mutationFn: (d: AdminProductInput) => adminCreateProduct(d),
    onSuccess: invalidate,
  });
  const updateMut = useMutation({
    mutationFn: (d: AdminProductInput) => adminUpdateProduct(editing!.id, d),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteProduct(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  if (creating || editing) {
    return (
      <div>
        <button
          onClick={() => {
            setCreating(false);
            setEditing(null);
          }}
          className="mb-4 font-body text-sm text-accent"
        >
          ← Back to list
        </button>
        <h1 className="mb-4 font-display text-2xl text-content">
          {editing ? 'Edit product' : 'New product'}
        </h1>
        <ProductForm
          families={families.data ?? []}
          initial={editing ?? undefined}
          submitting={createMut.isPending || updateMut.isPending}
          onSubmit={(d) => (editing ? updateMut.mutate(d) : createMut.mutate(d))}
        />
        {createMut.isError || updateMut.isError ? (
          <p className="mt-3 font-body text-sm text-danger">Save failed — check fields and token.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-content">Products</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-maroon px-4 py-2 font-body text-cream"
        >
          New product
        </button>
      </div>
      <ul className="divide-y divide-line">
        {products.data?.items.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-3 font-body">
            <span className="text-content">
              {p.name} <span className="text-muted">· {p.type}</span>
            </span>
            <span className="flex gap-3">
              <button onClick={() => setEditing(p)} className="text-accent">
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${p.name}?`)) deleteMut.mutate(p.id);
                }}
                className="text-danger"
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
