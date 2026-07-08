import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type SampleItem = { id: string; name: string; slug: string; image: string };
const LS = 'herencia.samples';

type Ctx = {
  samples: SampleItem[];
  isOpen: boolean;
  has: (id: string) => boolean;
  add: (item: SampleItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  open: (item?: SampleItem) => void;
  close: () => void;
};

const SampleCtx = createContext<Ctx | null>(null);

export function SampleProvider({ children }: { children: ReactNode }) {
  const [samples, setSamples] = useState<SampleItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS) || '[]') as SampleItem[];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS, JSON.stringify(samples));
  }, [samples]);

  const has = useCallback((id: string) => samples.some((s) => s.id === id), [samples]);
  const add = useCallback(
    (item: SampleItem) => setSamples((prev) => (prev.some((s) => s.id === item.id) ? prev : [...prev, item])),
    [],
  );
  const remove = useCallback((id: string) => setSamples((prev) => prev.filter((s) => s.id !== id)), []);
  const clear = useCallback(() => setSamples([]), []);
  const open = useCallback((item?: SampleItem) => { if (item) add(item); setIsOpen(true); }, [add]);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SampleCtx.Provider value={{ samples, isOpen, has, add, remove, clear, open, close }}>
      {children}
    </SampleCtx.Provider>
  );
}

export function useSamples(): Ctx {
  const c = useContext(SampleCtx);
  if (!c) throw new Error('useSamples must be used within SampleProvider');
  return c;
}
