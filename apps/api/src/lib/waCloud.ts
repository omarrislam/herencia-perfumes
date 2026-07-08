import type { OrderStatus } from '@herencia/shared';

// Official WhatsApp Business Cloud API (Meta Graph API) notifications.
// Business-initiated messages must use pre-approved templates — see
// docs/18_WHATSAPP_NOTIFICATIONS.md for the exact templates to register.
// Fully env-gated: when WA_PHONE_NUMBER_ID / WA_ACCESS_TOKEN are unset,
// every send is a silent no-op, and failures never break checkout/admin.

type OrderLike = {
  orderNumber: string;
  customer?: { name: string; phone: string } | null;
  items: { name: string; sizeLabel: string; qty: number }[];
  total: number;
  paymentMethod?: string | null;
};

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

function config() {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const token = process.env.WA_ACCESS_TOKEN;
  if (!phoneNumberId || !token) return null;
  return { phoneNumberId, token, lang: process.env.WA_TEMPLATE_LANG ?? 'en' };
}

// Egyptian local numbers (01XXXXXXXXX) → E.164 without the plus (201XXXXXXXXX).
export function normalizePhone(raw: string): string {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `2${digits}`;
  else if (digits.length === 10 && digits.startsWith('1')) digits = `20${digits}`;
  return digits;
}

// Template parameters may not contain newlines, tabs, or 4+ consecutive spaces.
const param = (s: string) => s.replace(/\s+/g, ' ').trim();

// Params for the `order_receipt` template: {{1}} name, {{2}} order number,
// {{3}} items, {{4}} total EGP, {{5}} payment line.
export function receiptParams(
  order: OrderLike,
  instapay?: { handle?: string | null } | null,
): string[] {
  const items = order.items.map((i) => `${i.name} ×${i.qty} (${i.sizeLabel})`).join(', ');
  const payment =
    order.paymentMethod === 'instapay'
      ? `InstaPay — please transfer${instapay?.handle ? ` to ${instapay.handle}` : ''} and send us the screenshot to confirm`
      : 'cash on delivery, estimated delivery 4–5 business days';
  return [
    param(order.customer?.name ?? 'valued customer'),
    order.orderNumber,
    param(items),
    order.total.toLocaleString('en-EG'),
    param(payment),
  ];
}

const STATUS_PHRASE: Record<OrderStatus, string> = {
  pending: 'is pending',
  confirmed: 'is confirmed and being prepared',
  shipped: 'is on its way to you',
  delivered: 'has been delivered — we hope you love it',
  cancelled: 'has been cancelled — contact us if this is unexpected',
};

// Params for the `order_status` template: {{1}} name, {{2}} order number, {{3}} update.
export function statusParams(order: OrderLike, status: OrderStatus): string[] {
  return [param(order.customer?.name ?? 'there'), order.orderNumber, STATUS_PHRASE[status]];
}

async function sendTemplate(to: string, templateName: string, params: string[]): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  const res = await fetch(`${GRAPH_URL}/${cfg.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: cfg.lang },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WhatsApp send failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

export async function sendOrderReceipt(
  order: OrderLike,
  instapay?: { handle?: string | null } | null,
): Promise<void> {
  try {
    if (!config() || !order.customer?.phone) return;
    await sendTemplate(
      normalizePhone(order.customer.phone),
      process.env.WA_RECEIPT_TEMPLATE ?? 'order_receipt',
      receiptParams(order, instapay),
    );
  } catch (err) {
    console.error('[api] wa receipt failed:', err instanceof Error ? err.message : err);
  }
}

export async function sendStatusUpdate(order: OrderLike, status: OrderStatus): Promise<void> {
  try {
    if (!config() || !order.customer?.phone) return;
    await sendTemplate(
      normalizePhone(order.customer.phone),
      process.env.WA_STATUS_TEMPLATE ?? 'order_status',
      statusParams(order, status),
    );
  } catch (err) {
    console.error('[api] wa status update failed:', err instanceof Error ? err.message : err);
  }
}
