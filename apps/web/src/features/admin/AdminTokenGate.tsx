// apps/web/src/features/admin/AdminTokenGate.tsx
import { useState, type ReactNode } from 'react';
import { getAdminToken, setAdminToken } from './adminClient';

export function AdminTokenGate({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState(() => getAdminToken().length > 0);
  const [value, setValue] = useState('');
  if (hasToken) return <>{children}</>;
  return (
    <div className="mx-auto max-w-sm py-24">
      <h1 className="mb-4 font-display text-2xl text-content">Admin access</h1>
      <p className="mb-4 font-body text-sm text-muted">
        Enter the admin token to manage the catalog. (Interim — replaced by login in Milestone 2.)
      </p>
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Admin token"
        aria-label="Admin token"
        className="mb-3 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content"
      />
      <button
        onClick={() => {
          setAdminToken(value);
          setHasToken(value.length > 0);
        }}
        className="w-full rounded-md bg-maroon px-4 py-2 font-body text-cream"
      >
        Continue
      </button>
    </div>
  );
}
