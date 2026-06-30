import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import * as api from '../lib/api';

export function WishlistButton({ productId, initial = false }: { productId: string; initial?: boolean }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

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
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => { void toggle(); }} disabled={loading || busy}
      aria-pressed={on} aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'}
      className="rounded-full border border-line p-2 text-content hover:text-accent">
      {on ? '♥' : '♡'}
    </button>
  );
}
