import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../../lib/api';

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{user ? user.email : 'anon'}</span>;
}

describe('AuthContext', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('shows anon when /me 401s', async () => {
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument());
  });
  it('shows the user when /me resolves', async () => {
    vi.spyOn(api, 'fetchMe').mockResolvedValue({ id: '1', name: 'Mai', email: 'mai@x.com', role: 'customer' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('mai@x.com')).toBeInTheDocument());
  });
});
