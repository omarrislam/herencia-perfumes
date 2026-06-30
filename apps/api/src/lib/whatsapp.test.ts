import { describe, it, expect } from 'vitest';
import { buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me url with an encoded order summary', () => {
    const url = buildWhatsAppUrl('+20 100 000 0000', {
      orderNumber: 'HRC-ABC', total: 1650,
      items: [{ name: 'Royal Oud', sizeLabel: '50ml', qty: 2 }],
      customer: { name: 'Mai' },
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/201000000000\?text=/);
    expect(decodeURIComponent(url)).toContain('HRC-ABC');
    expect(decodeURIComponent(url)).toContain('Royal Oud');
  });
});
