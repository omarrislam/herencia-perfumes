# Featured Note Moods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The home page featured strip shifts its background mood to match the active fragrance, derived from that product's notes.

**Architecture:** A pure derivation module maps a product's notes to one of seven mood ids. The featured band is extracted from `Home.tsx` into its own component, which renders two stacked gradient layers behind the cards and cross-fades them by opacity when the active card changes. Active card = the card nearest the carousel's centre, debounced to settle; hover is a desktop-only enhancement.

**Tech Stack:** React 18, TypeScript strict, Tailwind, Vitest + Testing Library. No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-29-featured-note-moods-design.md`.
- Work on branch `feat/featured-note-moods`. `master` stays at the savepoint tag `pre-featured-moods` (`7da159f`).
- **Mood must NEVER gate card visibility.** Cards render at full opacity unconditionally. If the active-card hook never fires, the section shows the `default` mood with all products visible. This is the round-36 regression guard.
- Do not modify `--cta`, `--accent`, `--text`, or `--surface` in any mood.
- Do not change `ProductCard`, the arrows, the round-34 auto-advance, or snap/swipe behaviour.
- Animations use `opacity` only (composite). Never transition `background-color` on the band.
- Mood layers are `aria-hidden="true"` and `pointer-events: none`.
- Reduced motion: mood changes apply instantly. The global `index.css` rule already forces `animation-duration`/`transition-duration` to `0.01ms`, so no extra code is needed — just do not add JS-driven timing that bypasses CSS.
- Run from repo root: `npm run test --workspace apps/web`, `npm run typecheck`, `npm run lint`.

### Deviation from the spec (approved change, recorded here)

The spec says mood palettes live in TypeScript and are applied as inline CSS custom
properties. **This plan puts the palettes in `index.css`, keyed by a `data-mood` attribute.**

Reason: the spec's approach requires reading the current theme in JS (`useTheme()`) to pick
the light or dark palette. That couples the component to `ThemeProvider` — which throws
outside a provider and would break the existing `Home.featured.test.tsx` — and duplicates
light/dark logic that CSS already does for free via `:root[data-theme=…]`. Keeping colours
in CSS means theme switching works with no JS at all.

`featuredMood.ts` therefore returns a `MoodId` string only, not a palette object.

---

### Task 1: Note-to-mood derivation

**Files:**
- Create: `apps/web/src/features/products/featuredMood.ts`
- Create: `apps/web/src/features/products/featuredMood.test.ts`
- Modify: `apps/web/src/lib/noteLibrary.ts` (export `resolveNoteSlug`, reuse it in `builtinNoteImage`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `resolveNoteSlug(name: string): string` from `apps/web/src/lib/noteLibrary.ts`
  - `MOOD_IDS: readonly MoodId[]`, `type MoodId = 'default'|'rose'|'amber'|'woody'|'fresh'|'gourmand'|'oud'`
  - `moodForProduct(product: { notes: { top: string[]; heart: string[]; base: string[] } }): MoodId`

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/featured-note-moods
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/features/products/featuredMood.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { moodForProduct } from './featuredMood';

const notes = (top: string[], heart: string[], base: string[]) => ({ notes: { top, heart, base } });

describe('moodForProduct', () => {
  // The four real featured products, notes copied from production.
  it('derives rose for Perla Rosa', () => {
    expect(
      moodForProduct(
        notes(
          ['Bergamot', 'Nutmeg', 'Rhubarb', 'Lychee'],
          ['Rose', 'Peony', 'Musk', 'Petalia'],
          ['Cashmeran', 'Cedar', 'Vetiver', 'Incense'],
        ),
      ),
    ).toBe('rose');
  });

  it('derives fresh for VASCO', () => {
    expect(
      moodForProduct(
        notes(
          ['Bergamot', 'Ginger', 'Lemon', 'mint', 'aldehydes'],
          ['Apple', 'Violet', 'pineapple', 'sage', 'Geranium'],
          ['Ambergris', 'Musk', 'Cedar', 'Vetiver', 'Fir Balsam', 'incense'],
        ),
      ),
    ).toBe('fresh');
  });

  it('derives amber for Eclipse from base notes alone', () => {
    expect(moodForProduct(notes([], [], ['Orange Blossom', 'Amber', 'Woods']))).toBe('amber');
  });

  it('derives gourmand for Ashes', () => {
    expect(
      moodForProduct(
        notes(
          ['cinnamon', 'Orange Blossom', 'Cardamom', 'Bergamot'],
          ['Vanilla', 'elemi'],
          ['praline', 'Musk', 'ambroxan', 'Guaiac Wood', 'Tonka Bean', 'almond'],
        ),
      ),
    ).toBe('gourmand');
  });

  it('falls back to default when no notes are recognised', () => {
    expect(moodForProduct(notes(['Unobtainium'], ['Flubber'], []))).toBe('default');
  });

  it('falls back to default when there are no notes at all', () => {
    expect(moodForProduct(notes([], [], []))).toBe('default');
  });

  it('folds aliases: cedarwood scores as cedar', () => {
    expect(moodForProduct(notes([], [], ['cedarwood', 'cedarwood', 'cedarwood']))).toBe('woody');
  });

  it('folds aliases: tonka scores as tonka-bean', () => {
    expect(moodForProduct(notes([], [], ['tonka']))).toBe('gourmand');
  });

  it('is case and whitespace insensitive', () => {
    const a = moodForProduct(notes([], [], ['  Tonka Bean ']));
    const b = moodForProduct(notes([], [], ['tonka bean']));
    expect(a).toBe(b);
    expect(a).toBe('gourmand');
  });

  it('does not let ubiquitous notes decide a mood', () => {
    // musk is weightless and bergamot is 0.5 — neither should out-vote nothing.
    expect(moodForProduct(notes(['Bergamot'], ['Musk'], ['Musk']))).toBe('fresh');
    // ...but a single character note beats a pile of filler.
    expect(moodForProduct(notes(['Bergamot', 'Musk', 'Musk'], [], ['Rose']))).toBe('rose');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test --workspace apps/web -- featuredMood`
Expected: FAIL — `Failed to resolve import "./featuredMood"`.

- [ ] **Step 4: Export `resolveNoteSlug` from `noteLibrary.ts`**

In `apps/web/src/lib/noteLibrary.ts`, replace the existing `builtinNoteImage` block at the bottom of the file with:

```ts
// Resolve a free-text note name to its library slug: lowercased, whitespace
// collapsed, aliases applied (cedarwood → cedar, tonka → tonka-bean).
// Exported because the featured-mood derivation keys on the same slugs.
export function resolveNoteSlug(name: string): string {
  const key = normalize(name);
  return ALIASES[key] ?? key.replace(/ /g, '-');
}

// Static image path for a built-in note, or null when the library has no match.
export function builtinNoteImage(name: string): string | null {
  const slug = resolveNoteSlug(name);
  return SLUGS.has(slug) ? `/notes/${slug}.webp` : null;
}
```

- [ ] **Step 5: Create `featuredMood.ts`**

Create `apps/web/src/features/products/featuredMood.ts`:

```ts
import { resolveNoteSlug } from '../../lib/noteLibrary';

// Background moods for the featured strip. Order matters: it breaks scoring
// ties deterministically, and 'default' first means an unscored product
// falls through to the site's normal palette.
export const MOOD_IDS = ['default', 'rose', 'amber', 'woody', 'fresh', 'gourmand', 'oud'] as const;
export type MoodId = (typeof MOOD_IDS)[number];

// Notes are weighted by how DISTINCTIVE they are, not by tier. Weighting the
// base highest is perfumery-correct for dry-down, but in this catalogue it
// collapses fragrances together: Perla Rosa and VASCO share cedar, vetiver and
// incense in the base, and bergamot and musk appear in three of four products.
// Character notes score high; ubiquitous support notes score at or near zero.
const NOTE_MOOD_WEIGHTS: Record<string, { mood: MoodId; weight: number }> = {
  // rose — florals
  rose: { mood: 'rose', weight: 3 },
  peony: { mood: 'rose', weight: 3 },
  jasmine: { mood: 'rose', weight: 3 },
  tuberose: { mood: 'rose', weight: 3 },
  lychee: { mood: 'rose', weight: 2 },
  petalia: { mood: 'rose', weight: 2 },
  violet: { mood: 'rose', weight: 2 },
  'orange-blossom': { mood: 'rose', weight: 2 },
  rhubarb: { mood: 'rose', weight: 1 },
  // amber
  amber: { mood: 'amber', weight: 4 },
  amberwood: { mood: 'amber', weight: 2 },
  benzoin: { mood: 'amber', weight: 2 },
  labdanum: { mood: 'amber', weight: 2 },
  ambergris: { mood: 'amber', weight: 1 },
  ambroxan: { mood: 'amber', weight: 1 },
  // gourmand
  vanilla: { mood: 'gourmand', weight: 3 },
  praline: { mood: 'gourmand', weight: 3 },
  'tonka-bean': { mood: 'gourmand', weight: 3 },
  caramel: { mood: 'gourmand', weight: 3 },
  chocolate: { mood: 'gourmand', weight: 3 },
  honey: { mood: 'gourmand', weight: 2 },
  cinnamon: { mood: 'gourmand', weight: 2 },
  cardamom: { mood: 'gourmand', weight: 2 },
  almond: { mood: 'gourmand', weight: 2 },
  nutmeg: { mood: 'gourmand', weight: 1 },
  // fresh — green, citrus, aromatic
  mint: { mood: 'fresh', weight: 3 },
  sage: { mood: 'fresh', weight: 3 },
  'fir-balsam': { mood: 'fresh', weight: 3 },
  basil: { mood: 'fresh', weight: 3 },
  lemon: { mood: 'fresh', weight: 2 },
  ginger: { mood: 'fresh', weight: 2 },
  geranium: { mood: 'fresh', weight: 2 },
  apple: { mood: 'fresh', weight: 2 },
  pineapple: { mood: 'fresh', weight: 2 },
  juniper: { mood: 'fresh', weight: 2 },
  aldehydes: { mood: 'fresh', weight: 1 },
  bergamot: { mood: 'fresh', weight: 0.5 },
  // woody
  'guaiac-wood': { mood: 'woody', weight: 2 },
  woods: { mood: 'woody', weight: 2 },
  sandalwood: { mood: 'woody', weight: 2 },
  patchouli: { mood: 'woody', weight: 2 },
  cedar: { mood: 'woody', weight: 1 },
  vetiver: { mood: 'woody', weight: 1 },
  incense: { mood: 'woody', weight: 1 },
  cashmeran: { mood: 'woody', weight: 1 },
  elemi: { mood: 'woody', weight: 1 },
  oakmoss: { mood: 'woody', weight: 1 },
  // oud — dominant whenever present
  oud: { mood: 'oud', weight: 4 },
  leather: { mood: 'oud', weight: 3 },
  saffron: { mood: 'oud', weight: 2 },
};

/** The mood a product's notes evoke. Always returns a valid id; never throws. */
export function moodForProduct(product: {
  notes: { top: string[]; heart: string[]; base: string[] };
}): MoodId {
  const all = [...product.notes.top, ...product.notes.heart, ...product.notes.base];
  const scores = new Map<MoodId, number>();
  for (const raw of all) {
    const hit = NOTE_MOOD_WEIGHTS[resolveNoteSlug(raw)];
    if (!hit || hit.weight <= 0) continue;
    scores.set(hit.mood, (scores.get(hit.mood) ?? 0) + hit.weight);
  }
  let best: MoodId = 'default';
  let bestScore = 0;
  for (const id of MOOD_IDS) {
    const score = scores.get(id) ?? 0;
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test --workspace apps/web -- featuredMood`
Expected: PASS, 10 tests.

- [ ] **Step 7: Verify nothing else broke**

Run: `npm run test --workspace apps/web` then `npm run typecheck` then `npm run lint`
Expected: all green. `noteLibrary` is used by `NotesPyramid`; `builtinNoteImage` behaviour is unchanged.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/products/featuredMood.ts apps/web/src/features/products/featuredMood.test.ts apps/web/src/lib/noteLibrary.ts
git commit -m "feat(web): derive a background mood from a fragrance's notes

Notes are weighted by distinctiveness rather than tier: Perla Rosa and
VASCO share cedar, vetiver and incense in the base, so a tier-weighted
derivation would collapse them onto the same mood.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Mood palettes in CSS, with a contrast gate

**Files:**
- Modify: `apps/web/src/styles/index.css` (append a mood block near the other section utilities)
- Create: `apps/web/src/features/products/featuredMood.contrast.test.ts`

**Interfaces:**
- Consumes: `MOOD_IDS` from Task 1.
- Produces: CSS classes `.mood-layer`, `.mood-glow` and per-mood custom properties selected by `[data-mood='<id>']`, defined for both `:root[data-theme='light']` and `:root[data-theme='dark']`.

- [ ] **Step 1: Write the failing contrast test**

This test reads the real stylesheet, so it cannot drift from what ships.

Create `apps/web/src/features/products/featuredMood.contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MOOD_IDS } from './featuredMood';

const css = readFileSync(resolve(__dirname, '../../styles/index.css'), 'utf8');

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const srgb = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Pull a custom property out of the first CSS block matching `selector`. */
function readVar(selector: string, prop: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  expect(block, `no CSS block found for selector: ${selector}`).toBeTruthy();
  const found = new RegExp(`${prop}\\s*:\\s*([^;]+);`).exec(block![1]);
  expect(found, `no ${prop} in block for: ${selector}`).toBeTruthy();
  return found![1].trim();
}

const THEMES = ['light', 'dark'] as const;

describe('featured mood contrast', () => {
  for (const theme of THEMES) {
    const text = readVar(`:root[data-theme='${theme}']`, '--text');

    for (const mood of MOOD_IDS) {
      it(`${mood} / ${theme}: body text stays readable on the mood background`, () => {
        const bg = readVar(`:root[data-theme='${theme}'] [data-mood='${mood}']`, '--mood-bg');
        const deep = readVar(`:root[data-theme='${theme}'] [data-mood='${mood}']`, '--mood-bg-deep');
        expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(text, deep)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace apps/web -- featuredMood.contrast`
Expected: FAIL — "no CSS block found for selector: `:root[data-theme='light'] [data-mood='default']`".

- [ ] **Step 3: Add the mood CSS**

Append to `apps/web/src/styles/index.css`, immediately after the `.no-scrollbar` rules:

```css
/* ------------------------------------------------------------------ */
/* Featured-strip moods — each fragrance tints the band behind the     */
/* cards. Only background + glow move; --accent gold, --cta maroon,    */
/* --text and --surface stay constant so the identity and the buy      */
/* button never shift. Layers cross-fade by OPACITY (composite-only);  */
/* gradients cannot be transitioned directly, hence two layers.        */
/* ------------------------------------------------------------------ */
.mood-layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(180deg, var(--mood-bg), var(--mood-bg-deep));
  transition: opacity 600ms ease;
}
.mood-layer[data-active='true'] { opacity: 1; }
.mood-glow {
  position: absolute;
  top: 50%;
  width: 46%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  pointer-events: none;
  border-radius: 9999px;
  background: radial-gradient(closest-side, var(--mood-glow), transparent);
  transition: opacity 600ms ease, left 600ms ease;
}

:root[data-theme='light'] [data-mood='default']  { --mood-bg: #f2e9d1; --mood-bg-deep: #e8dcbb; --mood-glow: rgba(169, 121, 59, 0.10); }
:root[data-theme='light'] [data-mood='rose']     { --mood-bg: #f5e7e2; --mood-bg-deep: #ecd8d1; --mood-glow: rgba(193, 122, 122, 0.16); }
:root[data-theme='light'] [data-mood='amber']    { --mood-bg: #f7ebd0; --mood-bg-deep: #f0dfb8; --mood-glow: rgba(201, 144, 63, 0.16); }
:root[data-theme='light'] [data-mood='woody']    { --mood-bg: #eee7d8; --mood-bg-deep: #e2d8c3; --mood-glow: rgba(138, 106, 74, 0.16); }
:root[data-theme='light'] [data-mood='fresh']    { --mood-bg: #ecebdd; --mood-bg-deep: #dfe0cc; --mood-glow: rgba(125, 138, 106, 0.16); }
:root[data-theme='light'] [data-mood='gourmand'] { --mood-bg: #f3e5d3; --mood-bg-deep: #e9d6bd; --mood-glow: rgba(168, 118, 63, 0.16); }
:root[data-theme='light'] [data-mood='oud']      { --mood-bg: #ece2d2; --mood-bg-deep: #ded1bc; --mood-glow: rgba(107, 74, 58, 0.16); }

:root[data-theme='dark'] [data-mood='default']  { --mood-bg: #150a0a; --mood-bg-deep: #0d0505; --mood-glow: rgba(208, 168, 102, 0.10); }
:root[data-theme='dark'] [data-mood='rose']     { --mood-bg: #190c0e; --mood-bg-deep: #110708; --mood-glow: rgba(214, 150, 150, 0.13); }
:root[data-theme='dark'] [data-mood='amber']    { --mood-bg: #180d07; --mood-bg-deep: #100805; --mood-glow: rgba(224, 173, 98, 0.13); }
:root[data-theme='dark'] [data-mood='woody']    { --mood-bg: #130c09; --mood-bg-deep: #0c0706; --mood-glow: rgba(166, 132, 96, 0.13); }
:root[data-theme='dark'] [data-mood='fresh']    { --mood-bg: #0f1210; --mood-bg-deep: #080a09; --mood-glow: rgba(150, 166, 128, 0.13); }
:root[data-theme='dark'] [data-mood='gourmand'] { --mood-bg: #170e08; --mood-bg-deep: #0f0806; --mood-glow: rgba(198, 146, 88, 0.13); }
:root[data-theme='dark'] [data-mood='oud']      { --mood-bg: #120909; --mood-bg-deep: #0b0505; --mood-glow: rgba(150, 108, 86, 0.13); }
```

- [ ] **Step 4: Run the contrast test to verify it passes**

Run: `npm run test --workspace apps/web -- featuredMood.contrast`
Expected: PASS, 14 tests (7 moods × 2 themes).

If any mood fails, adjust that mood's `--mood-bg`/`--mood-bg-deep` lightness — lighter in the light theme, darker in the dark theme — until it clears 4.5:1. Do not change `--text`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/styles/index.css apps/web/src/features/products/featuredMood.contrast.test.ts
git commit -m "feat(web): mood palettes in CSS with a WCAG contrast gate

Palettes are keyed by data-mood under each data-theme so light/dark comes
free from CSS and no component needs to read the theme in JS. The test
parses index.css itself, so the shipped values are what gets checked.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `useActiveCard` hook

**Files:**
- Create: `apps/web/src/hooks/useActiveCard.ts`
- Create: `apps/web/src/hooks/useActiveCard.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `useActiveCard(scrollerRef: RefObject<HTMLElement | null>, count: number): { activeIndex: number; setHovered: (i: number | null) => void }`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/hooks/useActiveCard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActiveCard } from './useActiveCard';

/** A scroller with `count` children, each 100px wide, in a 100px viewport. */
function makeScroller(count: number): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
  for (let i = 0; i < count; i += 1) {
    const child = document.createElement('div');
    child.getBoundingClientRect = () => ({ width: 100, left: i * 100 - el.scrollLeft }) as DOMRect;
    el.appendChild(child);
  }
  el.getBoundingClientRect = () => ({ width: 100, left: 0 }) as DOMRect;
  el.scrollLeft = 0;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('useActiveCard', () => {
  it('starts at 0 before any scroll event', () => {
    const el = makeScroller(4);
    const { result } = renderHook(() => useActiveCard({ current: el }, 4));
    expect(result.current.activeIndex).toBe(0);
  });

  it('settles on the card nearest the scroller centre', () => {
    const el = makeScroller(4);
    const { result } = renderHook(() => useActiveCard({ current: el }, 4));
    act(() => {
      el.scrollLeft = 200; // third card now spans the viewport
      el.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(200);
    });
    expect(result.current.activeIndex).toBe(2);
  });

  it('debounces: a burst of scroll events produces one settled value', () => {
    const el = makeScroller(4);
    const { result } = renderHook(() => useActiveCard({ current: el }, 4));
    act(() => {
      for (const x of [50, 120, 210, 300]) {
        el.scrollLeft = x;
        el.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(20); // shorter than the settle delay
      }
      vi.advanceTimersByTime(200);
    });
    expect(result.current.activeIndex).toBe(3);
  });

  it('hover overrides the scroll-derived index and releases on null', () => {
    const el = makeScroller(4);
    const { result } = renderHook(() => useActiveCard({ current: el }, 4));
    act(() => result.current.setHovered(2));
    expect(result.current.activeIndex).toBe(2);
    act(() => result.current.setHovered(null));
    expect(result.current.activeIndex).toBe(0);
  });

  it('clamps to the available card count', () => {
    const el = makeScroller(2);
    const { result } = renderHook(() => useActiveCard({ current: el }, 2));
    act(() => {
      el.scrollLeft = 9999;
      el.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(200);
    });
    expect(result.current.activeIndex).toBeLessThanOrEqual(1);
    expect(result.current.activeIndex).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace apps/web -- useActiveCard`
Expected: FAIL — cannot resolve `./useActiveCard`.

- [ ] **Step 3: Implement the hook**

Create `apps/web/src/hooks/useActiveCard.ts`:

```ts
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

// How long the scroller must be still before the active card is committed.
// Changing the mood mid-swipe looks nervous; settling reads as deliberate.
const SETTLE_MS = 120;

/**
 * Index of the carousel card nearest the scroller's horizontal centre.
 *
 * Purely decorative: callers must NOT gate rendering or visibility on this.
 * If no scroll ever happens the value stays 0, which is a valid state.
 */
export function useActiveCard(
  scrollerRef: RefObject<HTMLElement | null>,
  count: number,
): { activeIndex: number; setHovered: (i: number | null) => void } {
  const [scrolledIndex, setScrolledIndex] = useState(0);
  const [hovered, setHoveredState] = useState<number | null>(null);
  const frame = useRef(0);
  const timer = useRef(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || count <= 0) return;

    const measure = () => {
      const centre = el.getBoundingClientRect().left + el.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const r = (child as HTMLElement).getBoundingClientRect();
        const distance = Math.abs(r.left + r.width / 2 - centre);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setScrolledIndex(Math.max(0, Math.min(count - 1, best)));
    };

    const onScroll = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(measure);
      }, SETTLE_MS);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
    };
  }, [scrollerRef, count]);

  const setHovered = useCallback((i: number | null) => setHoveredState(i), []);

  return { activeIndex: hovered ?? scrolledIndex, setHovered };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace apps/web -- useActiveCard`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useActiveCard.ts apps/web/src/hooks/useActiveCard.test.ts
git commit -m "feat(web): useActiveCard - nearest-centre carousel card, settled

One signal for phone and desktop: mobile swipe and desktop auto-advance
both move the scroller, so neither needs a special case. Hover is a
desktop-only override layered on top.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Extract `FeaturedSection` from `Home.tsx` (pure move)

**Files:**
- Create: `apps/web/src/components/FeaturedSection.tsx`
- Modify: `apps/web/src/pages/Home.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1–3 yet.
- Produces: `<FeaturedSection products={ProductDTO[]} isLoading={boolean} />`, default-exported as a named export `FeaturedSection`.

**This task changes no behaviour.** It is a move so that the mood work in Task 5 lands in a focused file and can be reviewed on its own. `Home.featured.test.tsx` must pass untouched — that is the proof the move was clean.

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/FeaturedSection.tsx`. Move these pieces out of `Home.tsx` verbatim: `featuredCarousel`, `featuredScroller`, `featuredAutoStopped`, `tweenScroll`, `scrollFeatured`, the auto-advance `useEffect`, and the whole `featured:` section JSX.

```tsx
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ProductDTO } from '@herencia/shared';
import { ProductCard } from './ProductCard';
import { Skeleton } from './Skeleton';
import { Reveal } from './Reveal';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function FeaturedSection({
  products,
  isLoading,
}: {
  products: ProductDTO[];
  isLoading: boolean;
}) {
  const reduced = useReducedMotion();
  // With 3 or fewer the desktop shows a static 3-up grid; more become a
  // snap carousel with arrows (mobile always swipes).
  const carousel = products.length > 3;
  const scroller = useRef<HTMLDivElement>(null);
  const autoStopped = useRef(false);

  // Native smooth scrollTo gets cancelled by Chrome in handler contexts —
  // tween scrollLeft manually instead (cubic ease-out).
  const tweenScroll = (el: HTMLElement, target: number, duration: number) => {
    const from = el.scrollLeft;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      el.scrollLeft = from + (target - from) * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const scrollFeatured = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    autoStopped.current = true; // arrow click = the user has found the carousel
    const step = (el.firstElementChild?.getBoundingClientRect().width ?? el.clientWidth / 3) + 24;
    const max = el.scrollWidth - el.clientWidth;
    const target = Math.max(0, Math.min(max, el.scrollLeft + dir * step));
    if (reduced) {
      el.scrollLeft = target;
      return;
    }
    tweenScroll(el, target, 350);
  };

  // Gentle auto-scroll (desktop carousel only): one card every 4s, wrapping
  // back to the start. Skipped under reduced motion; paused while hovered,
  // off-screen or tab-hidden; stopped for good on any user interaction.
  useEffect(() => {
    if (!carousel || reduced) return;
    const el = scroller.current;
    if (!el) return;
    autoStopped.current = false;
    let hovered = false;
    let visible = false;
    const stop = () => {
      autoStopped.current = true;
    };
    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
    }, { threshold: 0.5 });
    io.observe(el);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('pointerdown', stop);
    el.addEventListener('wheel', stop, { passive: true });
    el.addEventListener('touchstart', stop, { passive: true });
    const id = window.setInterval(() => {
      if (autoStopped.current || hovered || !visible || document.hidden) return;
      if (window.innerWidth < 768) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const step = (el.firstElementChild?.getBoundingClientRect().width ?? el.clientWidth / 3) + 24;
      const atEnd = el.scrollLeft >= max - 4;
      tweenScroll(el, atEnd ? 0 : Math.min(max, el.scrollLeft + step), atEnd ? 700 : 600);
    }, 4000);
    return () => {
      io.disconnect();
      window.clearInterval(id);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchstart', stop);
    };
  }, [carousel, reduced, products.length]);

  return (
    <section>
      <Reveal>
        <div className="mb-10 text-center">
          <p className="eyebrow">The Collection</p>
          <h2 className="display mt-2 text-3xl text-content md:text-4xl">Featured scents</h2>
          <div className="rule-gold mx-auto mt-4 w-24" />
        </div>
      </Reveal>
      <div className="relative md:mx-auto md:max-w-4xl">
        <div
          ref={scroller}
          className={`no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-5 pb-3 sm:gap-5 ${
            carousel
              ? 'md:mx-0 md:snap-none md:gap-6 md:px-0 md:pb-0'
              : 'sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0'
          }`}
        >
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-full">
                  <Skeleton className="aspect-[5/6] rounded-xl" />
                </div>
              ))
            : products.map((p, i) => (
                // Mount-based CSS reveal, NOT scroll-based: cards parked
                // off-screen to the right of the carousel never intersect the
                // viewport, so an IntersectionObserver reveal left them at
                // opacity 0 forever.
                <div
                  key={p.id}
                  className={`anim-fade-up w-[46%] shrink-0 snap-start sm:w-[31%] ${carousel ? 'md:w-[31.5%]' : 'md:w-full'}`}
                  style={{ animationDelay: `${Math.min(i, 2) * 100}ms` }}
                >
                  <ProductCard product={p} />
                </div>
              ))}
        </div>
        {carousel && (
          <>
            <button
              type="button"
              aria-label="Previous products"
              onClick={() => scrollFeatured(-1)}
              className="absolute -left-6 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface font-body text-content shadow-lux transition-colors hover:border-accent hover:text-accent md:flex lg:-left-14"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next products"
              onClick={() => scrollFeatured(1)}
              className="absolute -right-6 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface font-body text-content shadow-lux transition-colors hover:border-accent hover:text-accent md:flex lg:-right-14"
            >
              →
            </button>
          </>
        )}
      </div>
      {!isLoading && products.length === 0 && (
        <p className="text-center font-body text-muted">No featured products yet.</p>
      )}
      <Reveal delay={0.25}>
        <div className="mt-10 text-center">
          <Link to="/products" className="btn-outline">
            View all perfumes
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Update `Home.tsx`**

Delete from `Home.tsx`: `featuredCarousel`, `featuredScroller`, `featuredAutoStopped`, `tweenScroll`, `scrollFeatured`, the auto-advance `useEffect`, and the entire `featured:` JSX body. Replace the `featured:` entry with:

```tsx
    featured: <FeaturedSection products={featuredItems} isLoading={featured.isLoading} />,
```

Add the import:

```tsx
import { FeaturedSection } from '../components/FeaturedSection';
```

Then remove any import left unused by the move — check `Skeleton` and `ProductCard`, which may no longer be referenced in `Home.tsx`. `npm run lint` will name them.

- [ ] **Step 3: Verify the move changed nothing**

Run: `npm run test --workspace apps/web` then `npm run typecheck` then `npm run lint`
Expected: all green, with `Home.featured.test.tsx` passing **unmodified**. That test renders `Home` and asserts all four cards are present and not held at opacity 0 — if the move were lossy it would fail.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/FeaturedSection.tsx apps/web/src/pages/Home.tsx
git commit -m "refactor(web): extract FeaturedSection from Home

Pure move, no behaviour change - Home.featured.test.tsx passes
unmodified. Gives the mood work a focused file to land in.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Wire moods into `FeaturedSection`

**Files:**
- Modify: `apps/web/src/components/FeaturedSection.tsx`
- Modify: `apps/web/src/pages/Home.featured.test.tsx`

**Interfaces:**
- Consumes: `moodForProduct` and `MoodId` (Task 1), the `.mood-layer`/`.mood-glow` CSS and `[data-mood]` palettes (Task 2), `useActiveCard` (Task 3), `FeaturedSection` (Task 4).
- Produces: the finished feature.

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/pages/Home.featured.test.tsx`, inside the existing `describe('Home featured products', …)`:

```tsx
  it('renders a mood layer for the first product on mount', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByRole('link', { name: /Perfume 1/i })).toBeInTheDocument());
    const active = document.querySelector('.mood-layer[data-active="true"]');
    expect(active).toBeTruthy();
    // Fixture notes are rose-dominant (see the `product` factory below).
    expect(active?.getAttribute('data-mood')).toBe('rose');
  });

  it('keeps every card visible no matter which card is active', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByRole('link', { name: /Perfume 1/i })).toBeInTheDocument());
    // Mood layers are decorative and must never gate the cards (round 36).
    for (const i of [1, 2, 3, 4]) {
      const card = screen.getByRole('link', { name: new RegExp(`Perfume ${i}`, 'i') });
      expect(hiddenByInlineOpacity(card)).toBe(false);
    }
    expect(document.querySelectorAll('.mood-layer').length).toBeGreaterThan(0);
  });
```

Then give the fixture real notes so the derivation has something to read. In the same file, change the `product` factory's `notes` line from `notes: { top: [], heart: [], base: [] },` to:

```ts
    notes: { top: ['Bergamot'], heart: ['Rose', 'Peony'], base: ['Cedar'] },
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npm run test --workspace apps/web -- Home.featured`
Expected: FAIL — the first new test finds no `.mood-layer[data-active="true"]`.

- [ ] **Step 3: Add the mood layers to `FeaturedSection`**

In `apps/web/src/components/FeaturedSection.tsx` add these imports:

```tsx
import { useMemo } from 'react';
import { moodForProduct, type MoodId } from '../features/products/featuredMood';
import { useActiveCard } from '../hooks/useActiveCard';
```

Inside the component, after `autoStopped`:

```tsx
  const { activeIndex, setHovered } = useActiveCard(scroller, products.length);
  // One derivation per list, not per render.
  const moods = useMemo<MoodId[]>(() => products.map(moodForProduct), [products]);
  const activeMood: MoodId = moods[activeIndex] ?? 'default';
  // The layer NOT currently active keeps the outgoing mood so the two can
  // cross-fade; gradients cannot be transitioned directly.
  const previousMood = useRef<MoodId>('default');
  const [layerA, setLayerA] = useState<MoodId>('default');
  const [aIsActive, setAIsActive] = useState(true);
  useEffect(() => {
    if (activeMood === previousMood.current) return;
    previousMood.current = activeMood;
    // Paint the incoming mood into whichever layer is hidden, then swap.
    setAIsActive((wasA) => {
      if (wasA) setLayerB(activeMood);
      else setLayerA(activeMood);
      return !wasA;
    });
  }, [activeMood]);
```

with `const [layerB, setLayerB] = useState<MoodId>('default');` declared alongside `layerA`, and `useRef`/`useState` added to the React import.

Wrap the section's contents so the layers sit behind them. Change the opening `<section>` to:

```tsx
    <section className="relative isolate overflow-hidden py-2">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="mood-layer" data-mood={layerA} data-active={aIsActive} />
        <div className="mood-layer" data-mood={layerB} data-active={!aIsActive} />
        <div
          className="mood-glow"
          data-mood={activeMood}
          style={{
            left: `${products.length ? ((activeIndex + 0.5) / products.length) * 100 : 50}%`,
          }}
        />
      </div>
```

and close it with `</section>` as before.

Finally, let hover drive the active card on desktop. On the card wrapper `<div>` inside `products.map`, add:

```tsx
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace apps/web -- Home.featured`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run everything**

Run: `npm run test --workspace apps/web` then `npm run typecheck` then `npm run lint`
Expected: all green.

- [ ] **Step 6: Verify in a real browser at mobile width**

```bash
npm run build
npm run start --workspace apps/api    # serves the built web on :4000, same-origin
```

Open `http://localhost:4000/` at a 390px viewport and confirm:
- all four cards are visible at scrollY 0 (round-36 guard, by eye);
- swiping the strip changes the band's background after the swipe settles;
- the glow follows the active card;
- the band never affects the header, cart drawer or footer;
- toggling dark mode keeps every mood readable.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/FeaturedSection.tsx apps/web/src/pages/Home.featured.test.tsx
git commit -m "feat(web): featured band takes its mood from the active fragrance

Two gradient layers cross-fade by opacity as the centred card changes;
the mood comes from that product's notes. Layers are decorative and
aria-hidden - cards render at full opacity regardless, so the round-36
invisible-card failure cannot return in a new form.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Derivation module → Task 1. `resolveNoteSlug` reuse → Task 1. Mood palettes and the seven moods → Task 2. Contrast gate → Task 2. `useActiveCard`, settle-debounce, hover enhancement → Task 3. `FeaturedSection` extraction → Task 4. Two-layer opacity cross-fade, glow, section-scoped variables, `aria-hidden`, round-36 guard, memoised derivation → Task 5. Reduced motion → covered by the existing global CSS rule, noted in Global Constraints. Rollback → Global Constraints.

**Placeholders.** None — every step carries the code or the exact command.

**Type consistency.** `MoodId` and `MOOD_IDS` are defined in Task 1 and used unchanged in Tasks 2, 3 and 5. `moodForProduct` takes a structural `{ notes: {top,heart,base} }` in Task 1 and receives a full `ProductDTO` in Task 5, which satisfies it. `useActiveCard(scrollerRef, count)` returns `{ activeIndex, setHovered }` in Task 3 and both are consumed in Task 5. The scroller ref is named `scroller` from Task 4 onward and is passed to `useActiveCard` under that name.

**Known deviation from the spec**, recorded at the top of this plan: palettes live in CSS keyed by `data-mood` rather than in TypeScript applied as inline styles.
