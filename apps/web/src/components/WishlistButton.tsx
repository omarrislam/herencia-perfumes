import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthContext';
import * as api from '../lib/api';

export function WishlistButton({ productId, initial = false }: { productId: string; initial?: boolean }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  // Only set when ADDING. Removing something should feel plain — celebrating a
  // removal is the kind of animation that makes an interface tiring.
  const [popping, setPopping] = useState(false);

  const toggle = async () => {
    if (!user) return navigate('/login', { state: { from: window.location.pathname } });
    setBusy(true);
    try {
      if (on) {
        await api.removeWishlist(productId);
        setOn(false);
      } else {
        await api.addWishlist(productId);
        setOn(true);
        setPopping(true);
      }
      void qc.invalidateQueries({ queryKey: ['account', 'wishlist'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        void toggle();
      }}
      disabled={loading || busy}
      aria-pressed={on}
      aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'}
      className="rounded-full border border-line p-2 text-content transition-colors hover:text-accent"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`h-5 w-5 ${popping ? 'heart-pop' : ''}`}
        // The fill transition carries the state change on its own under reduced
        // motion, where the pop is suppressed.
        style={{ transition: 'fill 200ms ease-out' }}
        fill={on ? 'var(--accent)' : 'none'}
        stroke={on ? 'var(--accent)' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        onAnimationEnd={() => setPopping(false)}
      >
        <path d="M12 20.4 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13Z" />
      </svg>
    </button>
  );
}
