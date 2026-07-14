# Samples Redesign — Per-Perfume Sample Stock + CMS Copy

_Approved approach: **Option A** (reserved sample line on the perfume itself). 2026-07-14._

## Goal

Split the samples system into two admin surfaces:

1. **Admin → Home ("Samples" card)** — owns ALL samples-related content: global
   sample price, size label, and every user-facing string in the home samples
   section (ThreeSteps) and the sample modal.
2. **Admin → Products (per perfume)** — owns availability: each perfume has its
   own `sampleStock`; a perfume offers samples iff `sampleStock > 0`.

The global "Perfume Sample" catalog product is **retired** (root cause of the
round-31 duplicate bug and the round-30 400 bug; it conflated content with
inventory).

## Data model

### `Product.sampleStock: number` (default 0)
- Meaningful for `type: 'perfume'` only (ignored elsewhere; UI hides the field).
- Shared `adminProductSchema` gains `sampleStock: z.number().int().min(0).default(0)`.
- Exposed on `ProductDTO` (the storefront gates CTAs/modal on it).

### `Setting.samples` (new object, all fields admin-editable)
| Field | Default (current live copy) |
|---|---|
| `price` | 60 |
| `sizeLabel` | `5ml` |
| `heading` | "Samples first. Bottles later." |
| `strapline` | current ThreeSteps strapline |
| `steps` (3 strings) | current three step lines |
| `ctaText` | "Order samples · {price} each" (supports `{price}` token) |
| `eyebrow` | "Try before you commit" (section + modal eyebrow) |
| `stickerTop` / `stickerBottom` | "{size} from" / "per sample" (the sticker's big middle line is always the price) |
| `modalTitle` | "Order samples" |
| `modalText` | current modal copy (supports `{price}`/`{size}` tokens) |

- Extend `updateSettingsSchema`, Setting model, serialize, `GET /api/settings`.
- No separate `enabled` flag: the existing `homeSections.samples` toggle hides
  the section; sample CTAs hide themselves when no perfume has stock (YAGNI).

### Reserved cart size label: `SAMPLE_SIZE_LABEL = 'sample'` (shared constant)
A sample cart line is `{ productId: <perfume id>, sizeLabel: 'sample', qty }`.
The wire label stays `'sample'` end-to-end for stable cart identity; UIs render
it as `Sample (5ml)` from settings. `SAMPLE_PRODUCT` constant and
`ensureSampleProduct` are deleted.

## Server behavior

### `priceItems` (cart service)
For a line with `sizeLabel === SAMPLE_SIZE_LABEL`:
- product must be `type: 'perfume'`, `isActive`, `sampleStock >= qty`,
  else the line is `available: false` (existing unavailable machinery);
- `unitPrice` = `settings.samples.price` (server-authoritative, as always);
- name/image from the perfume.
Non-sample lines are unchanged.

### `createOrder`
- Sample lines decrement `sampleStock` with the same atomic conditional
  pattern (`{ _id, sampleStock: { $gte: qty } }` + `$inc: { sampleStock: -qty } }`)
  and join the existing rollback list.
- Order item snapshot stores `sizeLabel: 'Sample · {settings sizeLabel}'`
  (orders are snapshots; receipts print "Amber Noir — Sample · 5ml ×1", giving
  fulfillment the exact pack list) **plus `isSample: true`** on the order item
  (model + DTO) so cancel-restore knows which stock pool to credit without
  parsing labels.
- The checkout "samples list in order notes" hack is removed — items are now
  explicit.

### Cancel restores stock (decision #45)
Cancelling restores `sampleStock` for sample lines (mirrors size-stock restore).

### Catalog query
`GET /api/products?samples=true` filters `type: 'perfume'`, `isActive`,
`sampleStock > 0` (used by the modal). Zod: same explicit `'true'/'false'`
parse as the existing `featured` param.

## Web behavior

- **ThreeSteps**: all copy + price + size label from `settings.samples`
  (hard-coded strings become the fallbacks). No more product fetch.
- **SampleModal**: lists perfumes from `?samples=true`; picking adds one
  `{perfumeId, 'sample', 1}` line each. Out-of-sample-stock perfumes simply
  don't appear.
- **ProductCard / PDP**: "Order a sample" / "Try this scent" CTAs render only
  when `product.sampleStock > 0`.
- **Cart / CartDrawer / Checkout**: lines with `sizeLabel === 'sample'` render
  "{name} — Sample ({settings sizeLabel})". The SampleContext picked-names
  plumbing (names under the aggregated line + notes injection) is deleted.
- **Admin ProductForm**: "Sample stock" number input (perfume type only).
- **Admin Home**: new "Samples" card with price, size label, and all copy
  fields.
- **Admin Inventory**: sample stock shown as a per-perfume row (samples are
  inventory; low/out badges apply).

## Migration / rollout

1. Deploy api + web together.
2. Delete the live "Perfume Sample" product (slug `sample-box`) and set
   `sampleStock` on the perfumes the user wants to offer (admin does this;
   default 0 = nothing offered until he sets stock).
3. Existing carts holding old `sample-box` lines show them as unavailable —
   customers remove them (accepted; near-zero order volume today).
4. Seed script: stop seeding the sample product; seed `sampleStock` on demo
   perfumes and `settings.samples` defaults.
5. Delete `ensureSampleProduct` + its boot call; `SAMPLE_PRODUCT` constant
   removed from shared (all 6 web usages replaced).

## Error handling

- Sample line, insufficient `sampleStock` → unavailable line → existing 409
  `cart_unavailable` at checkout; existing stock-conflict rollback covers races.
- `settings.samples` absent (old DB) → serialize normalizes to defaults.
- Reserved-label collision: `adminProductSchema` rejects a size row labeled
  `'sample'` (case-insensitive) so a perfume size can never shadow the
  reserved cart label.

## Testing

- **shared**: settings.samples schema defaults/partial-update; `sampleStock`
  validation; sample-label size rejection.
- **api**: priceItems sample line (price from settings, stock gating,
  inactive/non-perfume rejection); createOrder decrements + rolls back +
  cancel restores `sampleStock`; order item snapshot label; `?samples=true`
  filter; admin sampleStock roundtrip; settings samples update.
- **web**: ThreeSteps renders settings copy + fallbacks; modal lists only
  sampled perfumes and adds correct lines; cart renders sample lines; CTA
  gating on sampleStock; admin form field + Home card.

## Out of scope

Per-perfume sample pricing (global price locked by user), sample bundles,
free-sample promotions, migrating old order documents (their snapshots stay
correct as written).
