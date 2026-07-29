// Push notification via ntfy.sh on every new order (docs/19_NTFY_NOTIFICATIONS.md).
// Fully env-gated: when NTFY_TOPIC is unset, every send is a silent no-op, and
// failures never break checkout.

type OrderLike = {
  orderNumber: string;
  customer?: { name: string; phone: string } | null;
  items: { name: string; sizeLabel: string; qty: number }[];
  total: number;
  paymentMethod?: string | null;
};

function config() {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return null;
  return { topic, server: process.env.NTFY_SERVER ?? 'https://ntfy.sh' };
}

function adminUrl(path: string): string | undefined {
  const origin = process.env.CLIENT_ORIGIN?.split(',')[0]?.trim();
  return origin ? `${origin}${path}` : undefined;
}
const adminOrdersUrl = () => adminUrl('/admin/orders');
const adminInventoryUrl = () => adminUrl('/admin/inventory');

export function buildMessage(order: OrderLike): { title: string; body: string } {
  const items = order.items.map((i) => `${i.name} ×${i.qty} (${i.sizeLabel})`).join('\n');
  const payment =
    order.paymentMethod === 'instapay' ? 'InstaPay — payment pending' : 'Cash on delivery';
  const who = [order.customer?.name, order.customer?.phone].filter(Boolean).join(' · ');
  return {
    title: `New order ${order.orderNumber} — EGP ${order.total.toLocaleString('en-EG')}`,
    body: [who, items, payment].filter(Boolean).join('\n'),
  };
}

export type LowStockLine = { name: string; sizeLabel: string; remaining: number };

export function buildLowStockMessage(lines: LowStockLine[]): { title: string; body: string } {
  const outCount = lines.filter((l) => l.remaining === 0).length;
  return {
    title:
      outCount > 0
        ? `Stock alert — ${outCount} sold out`
        : `Low stock — ${lines.length} item${lines.length === 1 ? '' : 's'}`,
    body: lines
      .map((l) => `${l.name} (${l.sizeLabel}): ${l.remaining === 0 ? 'SOLD OUT' : `${l.remaining} left`}`)
      .join('\n'),
  };
}

/** Fired after an order drops a size (or a perfume's sample pool) to the low-stock line. */
export async function sendLowStockAlert(lines: LowStockLine[]): Promise<void> {
  if (lines.length === 0) return;
  const { title, body } = buildLowStockMessage(lines);
  await publish({
    title,
    message: body,
    priority: 3,
    tags: ['package'],
    click: adminInventoryUrl(),
  });
}

export async function sendNewOrderAlert(order: OrderLike): Promise<void> {
  const { title, body } = buildMessage(order);
  await publish({
    title,
    message: body,
    priority: 4,
    tags: ['moneybag'],
    click: adminOrdersUrl(),
  });
}

/**
 * JSON publish (not the header-based API): header values must be ByteString
 * (Latin-1 only), and titles/customer names routinely contain characters
 * (em dash, accents, Arabic) outside that range. The JSON body has no such
 * restriction. Note: priority must be numeric here (1-5) — the string form
 * ("high") is only accepted by the header-based API.
 *
 * Never throws: a notification failure must not break checkout.
 */
async function publish(fields: {
  title: string;
  message: string;
  priority: number;
  tags: string[];
  click?: string | undefined;
}): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  try {
    const { click, ...rest } = fields;
    const payload: Record<string, unknown> = { topic: cfg.topic, ...rest };
    if (click) payload.click = click;
    const res = await fetch(cfg.server, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`ntfy send failed (${res.status}): ${text.slice(0, 300)}`);
    }
  } catch (err) {
    console.error('[api] ntfy alert failed:', err instanceof Error ? err.message : err);
  }
}
