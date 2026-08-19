import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Stamp } from './Stamp';

let observe: ReturnType<typeof vi.fn>;
let trigger: ((entries: { isIntersecting: boolean }[]) => void) | null = null;

function mockIO({ fireImmediately = false } = {}) {
  observe = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        trigger = cb;
        if (fireImmediately) queueMicrotask(() => cb([{ isIntersecting: true }]));
      }
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
}

beforeEach(() => {
  trigger = null;
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
  mockIO();
});
afterEach(() => vi.unstubAllGlobals());

const box = (c: HTMLElement) => c.firstElementChild as HTMLElement;

describe('Stamp', () => {
  it('waits out of sight, then stamps when scrolled to', async () => {
    const { container } = render(<Stamp className="x">badge</Stamp>);
    await waitFor(() => expect(box(container).className).toContain('opacity-0'));
    trigger!([{ isIntersecting: true }]);
    await waitFor(() => expect(box(container).className).toContain('stamp-press'));
    expect(box(container).className).not.toContain('opacity-0');
  });

  it('shows immediately, unanimated, under reduced motion', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: /reduce/.test(q), media: q }));
    const { container } = render(<Stamp>badge</Stamp>);
    await waitFor(() => expect(box(container).className).not.toContain('opacity-0'));
    expect(box(container).className).not.toContain('stamp-press');
  });

  it('shows immediately when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Stamp>badge</Stamp>);
    await waitFor(() => expect(box(container).className).not.toContain('opacity-0'));
  });

  it('stamps something already on screen, since the observer reports on observe', async () => {
    mockIO({ fireImmediately: true });
    const { container } = render(<Stamp>badge</Stamp>);
    await waitFor(() => expect(box(container).className).toContain('stamp-press'));
  });

  it('forwards aria-hidden rather than dropping it', () => {
    const { container } = render(<Stamp aria-hidden="true">badge</Stamp>);
    expect(box(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders its children', () => {
    const { container } = render(<Stamp>EGP 60</Stamp>);
    expect(container.textContent).toContain('EGP 60');
  });
});
