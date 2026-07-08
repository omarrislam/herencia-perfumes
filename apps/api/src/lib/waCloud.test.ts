import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizePhone, receiptParams, statusParams, sendOrderReceipt } from './waCloud';

const order = {
  orderNumber: 'HRC-TEST-0001',
  customer: { name: 'Mai', phone: '01000000000' },
  items: [
    { name: 'Cedar Smoke', sizeLabel: '50ml', qty: 1 },
    { name: 'Perfume Sample', sizeLabel: '2ml', qty: 2 },
  ],
  total: 1000,
  paymentMethod: 'cod',
};

describe('waCloud', () => {
  beforeEach(() => {
    delete process.env.WA_PHONE_NUMBER_ID;
    delete process.env.WA_ACCESS_TOKEN;
  });
  afterEach(() => vi.restoreAllMocks());

  it('normalizes Egyptian local numbers to E.164 digits', () => {
    expect(normalizePhone('01000000000')).toBe('201000000000');
    expect(normalizePhone('+20 100 000 0000')).toBe('201000000000');
    expect(normalizePhone('1000000000')).toBe('201000000000');
    expect(normalizePhone('201000000000')).toBe('201000000000');
  });

  it('builds single-line receipt params (COD)', () => {
    const p = receiptParams(order);
    expect(p).toHaveLength(5);
    expect(p[0]).toBe('Mai');
    expect(p[1]).toBe('HRC-TEST-0001');
    expect(p[2]).toBe('Cedar Smoke ×1 (50ml), Perfume Sample ×2 (2ml)');
    expect(p[4]).toContain('cash on delivery');
    for (const s of p) expect(s).not.toMatch(/[\n\t]| {4,}/);
  });

  it('receipt params mention InstaPay transfer when applicable', () => {
    const p = receiptParams({ ...order, paymentMethod: 'instapay' }, { handle: 'store@instapay' });
    expect(p[4]).toContain('InstaPay');
    expect(p[4]).toContain('store@instapay');
  });

  it('builds status params from the status phrase map', () => {
    const p = statusParams(order, 'shipped');
    expect(p).toEqual(['Mai', 'HRC-TEST-0001', 'is on its way to you']);
  });

  it('sendOrderReceipt is a silent no-op when the Cloud API is not configured', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    await sendOrderReceipt(order);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sendOrderReceipt posts a template payload when configured and swallows API errors', async () => {
    process.env.WA_PHONE_NUMBER_ID = '123456';
    process.env.WA_ACCESS_TOKEN = 'token';
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"nope"}', { status: 400 }),
    );
    await expect(sendOrderReceipt(order)).resolves.toBeUndefined(); // fails soft
    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toBe('https://graph.facebook.com/v21.0/123456/messages');
    const body = JSON.parse(String(init!.body));
    expect(body.to).toBe('201000000000');
    expect(body.template.name).toBe('order_receipt');
    expect(body.template.components[0].parameters).toHaveLength(5);
  });
});
