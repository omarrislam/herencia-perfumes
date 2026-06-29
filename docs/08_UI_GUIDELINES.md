# 08 — UI Guidelines

Premium, heritage, calm. Generous whitespace. Let products and the crest breathe.

## Principles
- **Restraint = luxury.** Few accent colors, lots of space, strong typographic hierarchy.
- **Mobile-first.** Design the phone layout, then scale up.
- **One primary action per screen.** Clear hierarchy of CTAs.
- **Consistency.** Reuse components; don't invent one-off styles.

## Layout
- Container max-width ~1200px; comfortable gutters. 4/8px spacing scale.
- Cards: soft shadow, gold hairline border on hover, rounded but not bubbly.
- Sticky, slim header; cart drawer instead of full page where possible.

## Components (baseline)
Button (primary/secondary/ghost), Input/Select/Textarea, ProductCard, Price, Rating,
Badge (offer/new/sold-out), Modal, Drawer (cart/filters), Tabs, Accordion (notes/FAQ),
Skeleton, Toast, Pagination, Breadcrumbs, EmptyState.

## Imagery
- Product shots on dark maroon/parchment backgrounds per identity.
- Always responsive + lazy with blur placeholder. Maintain aspect ratio (no CLS).

## States
- Every list/section has loading (skeleton), empty, and error states.
- Buttons show loading + disabled states; forms show inline validation.

## Accessibility
- WCAG AA contrast (verify gold-on-cream and gold-on-maroon combos).
- Visible focus rings (gold). Keyboard operable. Alt text on images. Reduced-motion path.

## Tone of copy
- Elegant, concise, confident. "Luxury in every drop." Avoid hype/exclamation overload.
