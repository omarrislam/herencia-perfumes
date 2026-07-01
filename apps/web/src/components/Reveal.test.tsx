import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Reveal } from './Reveal';

// jsdom stubs — two browser APIs absent in the test environment:
// 1. window.matchMedia — jsdom does not implement it; needed by useReducedMotion.
// 2. IntersectionObserver — jsdom does not implement it; needed by framer-motion
//    whileInView. The stub is a no-op class so mount succeeds and children render.
beforeAll(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false; },
    }) as unknown as MediaQueryList;

  (globalThis as unknown as Record<string, unknown>).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('Reveal', () => {
  it('renders its children', () => {
    render(<Reveal><p>hello</p></Reveal>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
