// apps/web/src/pages/admin/AdminScentFamilies.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchScentFamilies } from '../../lib/api';
import { adminCreateFamily, adminDeleteFamily } from '../../features/admin/adminClient';

export default function AdminScentFamilies() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const families = useQuery({ queryKey: ['scent-families'], queryFn: fetchScentFamilies });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['scent-families'] });
  const createMut = useMutation({
    mutationFn: () => adminCreateFamily({ name }),
    onSuccess: () => {
      setName('');
      invalidate();
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteFamily(id),
    onSuccess: invalidate,
  });

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-content">Scent families</h1>
      <div className="mb-4 flex gap-2">
        <label>
          <span className="sr-only">New family name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New family name"
            className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
        <button
          onClick={() => createMut.mutate()}
          disabled={!name || createMut.isPending}
          className="rounded-md bg-maroon px-4 py-2 font-body text-cream disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <ul className="divide-y divide-line">
        {families.data?.map((f) => (
          <li key={f.id} className="flex items-center justify-between py-2 font-body text-content">
            {f.name}
            <button onClick={() => deleteMut.mutate(f.id)} className="text-red-500">
              Delete
            </button>
          </li>
        ))}
      </ul>
      {deleteMut.isError ? (
        <p className="mt-2 font-body text-sm text-red-500">Delete failed (family may be in use).</p>
      ) : null}
    </div>
  );
}
