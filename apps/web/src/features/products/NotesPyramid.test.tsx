import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotesPyramid } from './NotesPyramid';

// NotesPyramid imports fetchNoteIcons by name, so the module has to be mocked —
// spying on the namespace object does not rebind an ESM named import.
vi.mock('../../lib/api', () => ({ fetchNoteIcons: vi.fn(async () => []) }));

afterEach(() => vi.restoreAllMocks());

function wrap(notes: { top: string[]; heart: string[]; base: string[] }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NotesPyramid notes={notes} />
    </QueryClientProvider>,
  );
}

const notes = {
  top: ['Bergamot', 'Cardamom'],
  heart: ['Rose'],
  base: ['Oud', 'Musk'],
};

describe('NotesPyramid reveal', () => {
  it('renders every note', () => {
    wrap(notes);
    for (const n of [...notes.top, ...notes.heart, ...notes.base]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  it('reveals in the order a scent unfolds — top, then heart, then base', () => {
    const { container } = wrap(notes);
    const tiles = [...container.querySelectorAll('li.note-tile')] as HTMLElement[];
    const delay = (el: HTMLElement) => parseFloat(el.style.animationDelay);

    // Bergamot (top, first) before Rose (heart) before Oud (base).
    const byText = (t: string) => tiles.find((el) => el.textContent?.includes(t))!;
    expect(delay(byText('Bergamot'))).toBeLessThan(delay(byText('Rose')));
    expect(delay(byText('Rose'))).toBeLessThan(delay(byText('Oud')));
  });

  it('cascades tiles within a row', () => {
    const { container } = wrap(notes);
    const tiles = [...container.querySelectorAll('li.note-tile')] as HTMLElement[];
    const berg = tiles.find((el) => el.textContent?.includes('Bergamot'))!;
    const card = tiles.find((el) => el.textContent?.includes('Cardamom'))!;
    expect(parseFloat(card.style.animationDelay)).toBeGreaterThan(parseFloat(berg.style.animationDelay));
  });

  it('caps the delay so a long note list never strands the last tiles', () => {
    const many = Array.from({ length: 20 }, (_, i) => `note-${i}`);
    const { container } = wrap({ top: many, heart: [], base: [] });
    const tiles = [...container.querySelectorAll('li.note-tile')] as HTMLElement[];
    const delays = tiles.map((el) => parseFloat(el.style.animationDelay));
    // Round 36: elements left waiting at opacity 0 are indistinguishable from broken.
    expect(Math.max(...delays)).toBeLessThanOrEqual(600);
  });

  it('does not depend on scroll position — the round-36 failure mode', () => {
    // The featured carousel bug was a scroll-reveal whose items never intersected
    // the viewport and so stayed invisible forever. A mount-based CSS animation
    // cannot do that, so no IntersectionObserver may appear here.
    const observe = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observe;
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    const { container } = wrap(notes);
    expect(observe).not.toHaveBeenCalled();
    expect(container.querySelectorAll('li.note-tile').length).toBe(5);
    vi.unstubAllGlobals();
  });
});
