import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildMessage, sendNewOrderAlert } from './ntfy';

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

describe('ntfy', () => {
  beforeEach(() => {
    delete process.env.NTFY_TOPIC;
    delete process.env.NTFY_SERVER;
    delete process.env.CLIENT_ORIGIN;
  });
  afterEach(() => vi.restoreAllMocks());

  it('builds a title with order number + total and a body with items + payment', () => {
    const { title, body } = buildMessage(order);
    expect(title).toBe('New order HRC-TEST-0001 — EGP 1,000');
    expect(body).toContain('Mai · 01000000000');
    expect(body).toContain('Cedar Smoke ×1 (50ml)');
    expect(body).toContain('Perfume Sample ×2 (2ml)');
    expect(body).toContain('Cash on delivery');
  });

  it('mentions InstaPay pending when applicable', () => {
    const { body } = buildMessage({ ...order, paymentMethod: 'instapay' });
    expect(body).toContain('InstaPay — payment pending');
  });

  it('sendNewOrderAlert is a silent no-op when NTFY_TOPIC is unset', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    await sendNewOrderAlert(order);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sendNewOrderAlert posts a JSON body (never a header) so unicode titles cannot break it', async () => {
    // Regression test: an earlier version put the title in a `Title` HTTP header.
    // Fetch/undici require header values to be ByteString (Latin-1 only), and the
    // title's em dash (U+2014) is outside that range — every real send silently
    // threw and was swallowed by the try/catch, so no notification ever arrived.
    // Real `fetch` validates ByteString headers; a fully mocked fetch does not,
    // so this test avoids mocking fetch's Headers construction and instead
    // asserts the invariant directly: no dynamic text may live in a header.
    process.env.NTFY_TOPIC = 'herencia-orders-x2026';
    process.env.CLIENT_ORIGIN = 'https://herencia-one.vercel.app';
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(sendNewOrderAlert(order)).resolves.toBeUndefined(); // fails soft
    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toBe('https://ntfy.sh');

    // No custom headers — only the static, ASCII-only content-type.
    const headers = init!.headers as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).toEqual(['content-type']);

    const payload = JSON.parse(String(init!.body));
    expect(payload.topic).toBe('herencia-orders-x2026');
    expect(payload.title).toBe('New order HRC-TEST-0001 — EGP 1,000');
    expect(payload.message).toContain('Cedar Smoke');
    // priority must be numeric — ntfy's JSON publish API (unlike its header API)
    // rejects the string form ("high") with a generic "invalid JSON" 400.
    expect(payload.priority).toBe(4);
    expect(typeof payload.priority).toBe('number');
    expect(payload.tags).toEqual(['moneybag']);
    expect(payload.click).toBe('https://herencia-one.vercel.app/admin/orders');
  });

  it('respects NTFY_SERVER override', async () => {
    process.env.NTFY_TOPIC = 'x';
    process.env.NTFY_SERVER = 'https://ntfy.example.com';
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
    await sendNewOrderAlert(order);
    expect(String(spy.mock.calls[0]![0])).toBe('https://ntfy.example.com');
  });
});
