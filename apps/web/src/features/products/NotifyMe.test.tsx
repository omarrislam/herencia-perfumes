import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotifyMe } from './NotifyMe';
import * as api from '../../lib/api';

afterEach(() => vi.restoreAllMocks());

describe('NotifyMe', () => {
  it('starts collapsed so it does not shout at a browsing visitor', () => {
    render(<NotifyMe slug="perla-rosa" sizeLabel="55ml" />);
    expect(screen.getByRole('button', { name: /notify me when it's back/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/whatsapp number/i)).not.toBeInTheDocument();
  });

  it('submits the phone and confirms', async () => {
    const spy = vi.spyOn(api, 'notifyWhenBack').mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<NotifyMe slug="perla-rosa" sizeLabel="55ml" />);

    await user.click(screen.getByRole('button', { name: /notify me when it's back/i }));
    await user.type(screen.getByLabelText(/whatsapp number/i), '01012345678');
    await user.click(screen.getByRole('button', { name: /^notify me$/i }));

    await waitFor(() => expect(screen.getByText(/we'll message you on whatsapp/i)).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith('perla-rosa', { sizeLabel: '55ml', phone: '01012345678' });
  });

  it('shows a specific message for a rejected phone number', async () => {
    vi.spyOn(api, 'notifyWhenBack').mockRejectedValue(new api.ApiError(400, 'bad'));
    const user = userEvent.setup();
    render(<NotifyMe slug="perla-rosa" sizeLabel="55ml" />);

    await user.click(screen.getByRole('button', { name: /notify me when it's back/i }));
    await user.type(screen.getByLabelText(/whatsapp number/i), '123');
    await user.click(screen.getByRole('button', { name: /^notify me$/i }));

    await waitFor(() => expect(screen.getByText(/valid egyptian mobile number/i)).toBeInTheDocument());
  });

  it('falls back to a generic message on a server error', async () => {
    vi.spyOn(api, 'notifyWhenBack').mockRejectedValue(new api.ApiError(500, 'boom'));
    const user = userEvent.setup();
    render(<NotifyMe slug="perla-rosa" sizeLabel="55ml" />);

    await user.click(screen.getByRole('button', { name: /notify me when it's back/i }));
    await user.type(screen.getByLabelText(/whatsapp number/i), '01012345678');
    await user.click(screen.getByRole('button', { name: /^notify me$/i }));

    await waitFor(() => expect(screen.getByText(/could not save that just now/i)).toBeInTheDocument());
  });

  it('cannot be submitted empty', async () => {
    const user = userEvent.setup();
    render(<NotifyMe slug="perla-rosa" sizeLabel="55ml" />);
    await user.click(screen.getByRole('button', { name: /notify me when it's back/i }));
    expect(screen.getByRole('button', { name: /^notify me$/i })).toBeDisabled();
  });
});
