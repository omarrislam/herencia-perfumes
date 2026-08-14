import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getVisitorId, getSessionId, track, flush, SESSION_IDLE_MS } from './analytics';

// The queue is module-level state, so every test drains it first.
async function drain() {
  await flush();
}

beforeEach(async () => {
  await drain();
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('identity', () => {
  it('keeps one visitor id across calls', () => {
    expect(getVisitorId()).toBe(getVisitorId());
  });

  it('keeps the visitor id across sessions', () => {
    const v = getVisitorId();
    sessionStorage.clear();
    expect(getVisitorId()).toBe(v);
  });

  it('keeps the session id within the idle window', () => {
    expect(getSessionId()).toBe(getSessionId());
  });

  it('starts a new session after 30 minutes idle', () => {
    const first = getSessionId();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + SESSION_IDLE_MS + 1000);
    expect(getSessionId()).not.toBe(first);
  });
});

describe('utm capture', () => {
  it('captures campaign params from the landing url', () => {
    history.replaceState({}, '', '/?utm_source=instagram&utm_medium=social');
    getSessionId();
    expect(sessionStorage.getItem('herencia.utm')).toContain('instagram');
    history.replaceState({}, '', '/');
  });

  it('does not let a later navigation overwrite the landing campaign', () => {
    history.replaceState({}, '', '/?utm_source=instagram');
    const first = getSessionId();
    history.replaceState({}, '', '/products/ashes');
    expect(getSessionId()).toBe(first);
    expect(sessionStorage.getItem('herencia.utm')).toContain('instagram');
    expect(sessionStorage.getItem('herencia.landing')).toBe('/');
    history.replaceState({}, '', '/');
  });
});

describe('flush', () => {
  it('sends queued events via sendBeacon', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    track('page_view', { path: '/' });
    await flush();
    expect(beacon).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(beacon.mock.calls[0]![1]));
    expect(body.events[0].type).toBe('page_view');
    expect(body.session.sessionId).toBeTruthy();
  });

  it('falls back to a keepalive fetch when sendBeacon is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
    const f = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', f);
    track('page_view', { path: '/' });
    await flush();
    expect(f).toHaveBeenCalled();
    expect(f.mock.calls[0]![1]).toMatchObject({ keepalive: true });
  });

  it('does nothing when the queue is empty', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    await flush();
    expect(beacon).not.toHaveBeenCalled();
  });

  it('never throws when the network fails', async () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    track('page_view', { path: '/' });
    await expect(flush()).resolves.toBeUndefined();
  });

  it('carries the product slug, never an id', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    track('add_to_cart', { path: '/products/ashes', productSlug: 'ashes' });
    await flush();
    const body = JSON.parse(String(beacon.mock.calls[0]![1]));
    expect(body.events[0].productSlug).toBe('ashes');
    expect(body.events[0].productId).toBeUndefined();
  });
});
