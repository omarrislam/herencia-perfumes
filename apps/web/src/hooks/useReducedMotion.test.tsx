import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
});
