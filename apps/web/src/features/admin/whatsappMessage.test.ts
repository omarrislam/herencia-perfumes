import { describe, it, expect } from 'vitest';
import type { OrderDTO } from '@herencia/shared';
import { customerWhatsAppUrl, receiptMessage, statusMessage } from './whatsappMessage';

const order = {
  orderNumber: 'HRC-ABC',
  customer: { name: 'Mai', phone: '01012345678' },
  items: [
    { name: 'Royal Oud', sizeLabel: '50ml', qty: 2 },
    { name: 'Cedar Smoke', sizeLabel: '10ml', qty: 1 },
  ],
  total: 1650,
  paymentMethod: 'cod',
  status: 'shipped',
} as unknown as OrderDTO;

describe('receiptMessage', () => {
  it('lists every item, the total and a COD payment line', () => {
    const msg = receiptMessage(order);
    expect(msg).toContain('Thank you Mai!');
    expect(msg).toContain('HRC-ABC');
    expect(msg).toContain('Royal Oud ×2 (50ml)');
    expect(msg).toContain('Cedar Smoke ×1 (10ml)');
    expect(msg).toContain('1,650 EGP');
    expect(msg).toContain('cash on delivery');
  });

  it('names the InstaPay handle when the order is InstaPay', () => {
    const instapay = { ...order, paymentMethod: 'instapay' } as unknown as OrderDTO;
    expect(receiptMessage(instapay, 'omar@instapay')).toContain('omar@instapay');
  });

  it('omits the handle gracefully when settings have none', () => {
    const instapay = { ...order, paymentMethod: 'instapay' } as unknown as OrderDTO;
    const msg = receiptMessage(instapay);
    expect(msg).toContain('InstaPay');
    expect(msg).not.toContain('undefined');
  });
});

describe('statusMessage', () => {
  it('describes the order’s current status', () => {
    expect(statusMessage(order)).toBe(
      'Hi Mai, an update on your HERENCIA order HRC-ABC: it is on its way to you.',
    );
  });
});

describe('customerWhatsAppUrl', () => {
  it('converts a local Egyptian number to E.164 and encodes the text', () => {
    const url = customerWhatsAppUrl('01012345678', 'Hi there');
    expect(url).toBe('https://wa.me/201012345678?text=Hi%20there');
  });

  it('accepts numbers already in +20 / 20 form', () => {
    expect(customerWhatsAppUrl('+20 101 234 5678', 'x')).toMatch(/wa\.me\/201012345678\?/);
    expect(customerWhatsAppUrl('201012345678', 'x')).toMatch(/wa\.me\/201012345678\?/);
  });
});
