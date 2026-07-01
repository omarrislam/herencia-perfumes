import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({ matches, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } }) as unknown as MediaQueryList;
}

describe('useReducedMotion', () => {
  beforeEach(() => mockMatchMedia(false));
  it('returns false when motion is allowed', () => {
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });
  it('returns true when reduce is preferred', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });
  it('updates live when the media query fires a change event', () => {
    let capturedHandler: (() => void) | null = null;
    // Keep as plain object so we can mutate .matches freely (MediaQueryList.matches is read-only)
    const raw = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener(event: string, handler: () => void) {
        if (event === 'change') capturedHandler = handler;
      },
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false; },
    };
    window.matchMedia = () => raw as unknown as MediaQueryList;

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // simulate OS flipping to prefers-reduced-motion: reduce
    raw.matches = true;
    act(() => { capturedHandler?.(); });

    expect(result.current).toBe(true);
  });
});
