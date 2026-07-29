# Featured products — note-derived section moods

_Design spec · 2026-07-29_

## Goal

Each featured product on the home page gets its own atmosphere. As a customer moves
through the featured strip, the section's background shifts to a mood derived from that
fragrance's notes — so browsing feels like walking between rooms rather than scrolling a
grid. Every mood stays inside the HERENCIA identity: cream, maroon and gold, varied by
temperature and depth, never by hue.

## Scope

Approach **A** (agreed): the existing featured strip keeps its layout and its cards. Only
the band *behind* the cards changes. This is not a one-product-per-screen showcase.

Intensity **medium** (agreed): background shift plus a soft radial glow behind the active
card. No note-motif watermark, no tinted heading rule.

Mood source: **pure derivation from notes** (agreed). No admin field, no per-product
override. If a derived mood is ever wrong, the note weights are tuned in code.

## Non-goals

- No change to the desktop carousel arrows, the round-34 auto-advance, or the snap/swipe
  behaviour.
- No change to `ProductCard` itself. Cards keep the cream `--surface`.
- No change to `--cta`. The maroon buy button is the conversion element and stays constant
  across every mood.
- No new runtime dependency. No framer-motion in this path.

## The hard constraint, carried from round 36

The featured cards were previously invisible on mobile because their reveal was gated on
IntersectionObserver, and carousel cards parked off-screen never intersect. That bug is
fixed and must not return in a new form.

**The mood system must never gate card visibility.** Cards render at full opacity
unconditionally. The mood layers sit *behind* them and are decorative. If the active-card
hook never fires — no scroll events, no JS, an observer that never triggers — the section
renders the default mood with all products fully visible. Fail-safe by construction, and
asserted by test.

## Architecture

Three new units, each with one purpose.

### 1. `apps/web/src/features/products/featuredMood.ts`

Pure, no React, no side effects.

```ts
export type MoodId = 'default' | 'rose' | 'amber' | 'woody' | 'fresh' | 'gourmand' | 'oud';
export type MoodPalette = { bg: string; bgDeep: string; glow: string };
export type Mood = { id: MoodId; label: string; light: MoodPalette; dark: MoodPalette };

export function moodForProduct(product: ProductDTO): Mood;
```

`moodForProduct` flattens the product's `notes.top`, `notes.heart` and `notes.base`,
resolves each name to a slug, looks up `NOTE_MOOD_WEIGHTS`, accumulates a score per mood,
and returns the highest. No matches, or an empty note list, returns `default`. Ties are
broken by the declaration order of `MOODS` so the result is deterministic.

**Notes are weighted by how distinctive they are, not by tier.** This is the central design
decision. Weighting base notes highest is perfumery-correct for dry-down, but in this
catalogue it collapses two fragrances together: Perla Rosa and VASCO share cedar, vetiver
and incense in the base, and bergamot and musk appear in three of the four products.
Weighting by tier would read Perla Rosa as woody-smoke and discard the rose that defines
it. Character notes therefore score high and ubiquitous support notes score at or near
zero.

### 2. `apps/web/src/hooks/useActiveCard.ts`

```ts
export function useActiveCard(
  scrollerRef: RefObject<HTMLElement>,
  count: number,
): { activeIndex: number; setHovered: (i: number | null) => void };
```

Listens to `scroll` on the existing `featuredScroller`, throttled with `requestAnimationFrame`,
and computes the index of the card whose centre is nearest the scroller's centre. The result
is **debounced to settle** — it updates ~120ms after scrolling stops, not continuously
during a swipe. Continuous tracking looks nervous and costs paint on every frame; settling
reads as deliberate.

`setHovered` is a desktop progressive enhancement: hovering a card makes it active
immediately, and leaving releases back to the scroll-derived index. Hover is never
required — mobile drives the same `activeIndex` purely from scroll position, so there is
one code path and no branching on device.

Returns `0` before any scroll event, so the first product's mood is the initial state.

### 3. `apps/web/src/components/FeaturedSection.tsx`

The featured band, extracted from `Home.tsx`. `Home.tsx` is already the whole home page,
and this band is gaining real logic; extracting it gives the feature a testable boundary
instead of growing a file that is doing too much. This is the only refactor in this spec.

Props: `{ products: ProductDTO[]; isLoading: boolean }`. It owns the scroller ref, the
arrows, the auto-advance effect, the mood layers and `useActiveCard`. `Home.tsx` renders
`<FeaturedSection …/>` in place of the current inline JSX and keeps ownership of the
`featured` query.

The auto-advance effect, the arrow handlers and the `tweenScroll` helper move across
unchanged — this is a move, not a rewrite.

## How the mood is applied

The section element carries the mood as **inline CSS custom properties**, scoped to itself:

```
style={{ '--mood-bg': p.bg, '--mood-bg-deep': p.bgDeep, '--mood-glow': p.glow }}
```

Never on `:root`. The header, cart drawer, footer and every other section are unaffected,
and a mood cannot leak out of the band.

Behind the strip sit two absolutely-positioned, `aria-hidden` gradient layers plus one
radial glow element. On a mood change the incoming layer fades in by **opacity** and the
two layers swap roles. Two layers are necessary because CSS gradients cannot be
transitioned directly; opacity can, and it is composite-only, which satisfies the
performance budget and the transforms-and-opacity rule. Transitioning `background-color`
on a full-width band would repaint on every frame and judder mid-swipe on a phone.

The glow is a soft radial positioned horizontally over the active card, following it with
the same opacity-based transition.

Which palette is read — `light` or `dark` — follows the app's existing theme, via
`ThemeProvider`'s `data-theme` attribute on the root element.

## The moods

Seven entries, all low-saturation and warm-leaning except `fresh`, which is a muted
grey-green cream rather than a mint. Light backgrounds stay light and dark backgrounds
stay dark, which is what keeps text contrast safe.

| Mood | Light `bg` / `bgDeep` | Dark `bg` / `bgDeep` | Glow |
|---|---|---|---|
| `default` | `#f2e9d1` / `#e8dcbb` | `#150a0a` / `#0d0505` | none |
| `rose` | `#f5e7e2` / `#ecd8d1` | `#190c0e` / `#110708` | rose `#c17a7a` |
| `amber` | `#f7ebd0` / `#f0dfb8` | `#180d07` / `#100805` | amber `#c9903f` |
| `woody` | `#eee7d8` / `#e2d8c3` | `#130c09` / `#0c0706` | umber `#8a6a4a` |
| `fresh` | `#ecebdd` / `#dfe0cc` | `#0f1210` / `#080a09` | sage `#7d8a6a` |
| `gourmand` | `#f3e5d3` / `#e9d6bd` | `#170e08` / `#0f0806` | praline `#a8763f` |
| `oud` | `#ece2d2` / `#ded1bc` | `#120909` / `#0b0505` | deep resin `#6b4a3a` |

Glow values are applied at low alpha (≈0.16 light, ≈0.13 dark).

**`--accent` is deliberately not part of a mood.** The earlier discussion floated nudging
it per mood; on reflection the brand gold is the single most identifiable element of the
identity and holding it constant across all moods is the more luxurious choice. Mood is
carried entirely by background temperature and glow. This is a change from the verbal
design — flag it if you disagree.

## Note weights

`NOTE_MOOD_WEIGHTS: Record<string, { mood: MoodId; weight: number }>`, keyed by resolved
note slug. Representative entries — high scores are character notes, near-zero are the
ubiquitous ones:

| Slug | Mood | Weight | Why |
|---|---|---|---|
| `rose`, `peony` | rose | 3 | Signature florals |
| `lychee`, `petalia`, `violet`, `orange-blossom` | rose | 2 | Supporting florals |
| `amber` | amber | 4 | Strongly identity-defining; also the only real signal Eclipse carries |
| `ambergris`, `ambroxan` | amber | 1 | Amber-adjacent but common |
| `vanilla`, `praline`, `tonka-bean` | gourmand | 3 | Define a gourmand outright |
| `cinnamon`, `cardamom`, `almond` | gourmand | 2 | Warm spice and nut |
| `mint`, `sage`, `fir-balsam` | fresh | 3 | Unmistakably green/aromatic |
| `lemon`, `ginger`, `geranium`, `apple`, `pineapple` | fresh | 2 | Fresh and fruity |
| `aldehydes` | fresh | 1 | Airy but weak |
| `guaiac-wood`, `woods` | woody | 2 | Wood character |
| `cedar`, `vetiver`, `incense`, `cashmeran`, `elemi` | woody | 1 | Present in most compositions |
| `oud`, `leather` | oud | 4 | Dominant when present |
| `bergamot` | fresh | 0.5 | In three of four products — must not decide anything |
| `musk` | — | 0 | Universal; carries no identity |

Note names are resolved through a new `resolveNoteSlug(name)` exported from
`noteLibrary.ts`, reusing its existing `normalize` and `ALIASES`. Casing folds
(`cinnamon`/`Cinnamon`) and aliases fold for free (`cedarwood`→`cedar`,
`frankincense`→`incense`, `tonka`→`tonka-bean`). No parallel normaliser is introduced.

### Derivation for the current catalogue

Verified by hand against the live product data, and asserted by test:

| Product | Winning signal | Mood |
|---|---|---|
| Perla Rosa | rose 3 + peony 3 + lychee 2 + petalia 2 vs woody 4 | `rose` |
| VASCO | mint/sage/fir-balsam 3 each + lemon/ginger/geranium/apple/pineapple 2 each ≈ 20 vs woody 3 | `fresh` |
| Eclipse | amber 4 vs rose 2, woody 2 — from three base notes and nothing else | `amber` |
| Ashes | vanilla/praline/tonka 3 each + cinnamon/cardamom/almond 2 each ≈ 15 vs woody 3 | `gourmand` |

## Accessibility

- `prefers-reduced-motion`: mood changes apply instantly with no cross-fade and the glow is
  static. Reuses the existing `useReducedMotion` hook.
- Mood layers are `aria-hidden` and purely decorative. No semantic change, nothing
  announced, no focus behaviour.
- **Contrast is a build gate.** A test computes the WCAG contrast ratio of every mood's
  `bg` against the theme's `--text`, in both light and dark, and fails below 4.5:1. A mood
  that would harm readability cannot be merged.

## Performance

- Two gradient layers plus one glow, all transitioned by `opacity` only — composite, not
  paint.
- `moodForProduct` is pure and memoised over the featured list, so derivation runs once per
  load rather than per render.
- No new dependency, no framer-motion, no added network work.
- Layers are absolutely positioned behind existing content, so the band's height is
  unchanged and there is no CLS.

## Testing

**`featuredMood.test.ts`**
- Each of the four real products derives its expected mood.
- Eclipse's base-only, three-note input still derives `amber` (sparse-data case).
- A product with unknown notes derives `default`.
- A product with no notes at all derives `default`.
- Alias folding: `cedarwood` scores as `cedar`; `tonka` as `tonka-bean`.
- Case-insensitivity: `Cinnamon` and `cinnamon` score identically.
- Ubiquity guard: a product whose only notes are `musk` and `bergamot` does **not** derive
  a strong mood.

**`featuredMood.contrast.test.ts`**
- Every mood × both themes meets 4.5:1 against `--text`.

**`Home.featured.test.tsx`** (extended)
- All featured cards remain visible regardless of `activeIndex` — the round-36 guard.
- The section renders a mood layer for the first product on mount.

**`useActiveCard.test.ts`**
- Nearest-centre index maths.
- Settle debounce: rapid scroll events produce one final update, not many.
- Returns `0` before any scroll event.

## Files

New:
- `apps/web/src/features/products/featuredMood.ts`
- `apps/web/src/features/products/featuredMood.test.ts`
- `apps/web/src/features/products/featuredMood.contrast.test.ts`
- `apps/web/src/hooks/useActiveCard.ts`
- `apps/web/src/hooks/useActiveCard.test.ts`
- `apps/web/src/components/FeaturedSection.tsx`

Changed:
- `apps/web/src/lib/noteLibrary.ts` — export `resolveNoteSlug`
- `apps/web/src/pages/Home.tsx` — render `<FeaturedSection/>`, drop the inline band
- `apps/web/src/styles/index.css` — mood layer and glow classes
- `apps/web/src/pages/Home.featured.test.tsx` — extended guards

## Rollback

Savepoint tag **`pre-featured-moods`** on `7da159f` — the state currently live and
verified. To revert:

```bash
git checkout master && vercel --prod
```

Work happens on a branch (`feat/featured-note-moods`), so `master` stays at the known-good
state until the feature is explicitly merged.
