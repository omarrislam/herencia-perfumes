import { describe, it, expect } from 'vitest';
import { trackBatchSchema } from './analytics';

const base = {
  session: { sessionId: 'S1', visitorId: 'V1', landingPath: '/' },
  events: [{ type: 'page_view', path: '/' }],
};

describe('trackBatchSchema', () => {
  it('accepts a minimal valid batch', () => {
    expect(trackBatchSchema.safeParse(base).success).toBe(true);
  });

  it('accepts utm fields and a product slug', () => {
    const parsed = trackBatchSchema.parse({
      session: {
        ...base.session,
        utm: { source: 'instagram', medium: 'social' },
        referrer: 'https://instagram.com/',
      },
      events: [{ type: 'product_view', path: '/products/ashes', productSlug: 'ashes' }],
    });
    expect(parsed.session.utm?.source).toBe('instagram');
    expect(parsed.events[0]!.productSlug).toBe('ashes');
  });

  it('rejects an unknown event type', () => {
    const bad = { ...base, events: [{ type: 'hack', path: '/' }] };
    expect(trackBatchSchema.safeParse(bad).success).toBe(false);
  });

  it('strips a client-supplied value — money is server-derived only', () => {
    const parsed = trackBatchSchema.parse({
      ...base,
      events: [{ type: 'add_to_cart', path: '/', productSlug: 'ashes', value: 999999 }],
    });
    expect('value' in parsed.events[0]!).toBe(false);
  });

  it('rejects an empty batch and caps an oversized one', () => {
    expect(trackBatchSchema.safeParse({ ...base, events: [] }).success).toBe(false);
    const many = Array.from({ length: 51 }, () => ({ type: 'page_view' as const, path: '/' }));
    expect(trackBatchSchema.safeParse({ ...base, events: many }).success).toBe(false);
  });

  it('rejects an over-long path rather than storing unbounded strings', () => {
    const bad = { ...base, events: [{ type: 'page_view', path: 'x'.repeat(600) }] };
    expect(trackBatchSchema.safeParse(bad).success).toBe(false);
  });

  it('strips PII the client has no business sending', () => {
    const parsed = trackBatchSchema.parse({
      session: { ...base.session, phone: '01012345678', email: 'a@b.c' },
      events: base.events,
    });
    expect(JSON.stringify(parsed)).not.toContain('01012345678');
    expect(JSON.stringify(parsed)).not.toContain('a@b.c');
  });
});
