import type { OrderDTO, OrderStatus } from '@herencia/shared';

// Customer-facing WhatsApp messages, sent by the owner from the store's own
// number via a wa.me deep link (tap the link, WhatsApp opens pre-filled, hit
// send). The Cloud API path in apps/api/src/lib/waCloud.ts stays dormant — the
// business portfolio is permanently restricted from app sharing, so templates
// can never be approved. Copy here mirrors those templates so the two can't drift.

// Egyptian local numbers (01XXXXXXXXX) → E.164 without the plus, which wa.me requires.
function normalizePhone(raw: string): string {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `2${digits}`;
  else if (digits.length === 10 && digits.startsWith('1')) digits = `20${digits}`;
  return digits;
}

const STATUS_PHRASE: Record<OrderStatus, string> = {
  pending: 'is pending',
  confirmed: 'is confirmed and being prepared',
  shipped: 'is on its way to you',
  delivered: 'has been delivered — we hope you love it',
  cancelled: 'has been cancelled — contact us if this is unexpected',
};

export function receiptMessage(order: OrderDTO, instapayHandle?: string | null): string {
  const items = order.items.map((i) => `${i.name} ×${i.qty} (${i.sizeLabel})`).join(', ');
  const payment =
    order.paymentMethod === 'instapay'
      ? `InstaPay — please transfer${instapayHandle ? ` to ${instapayHandle}` : ''} and send us the screenshot to confirm`
      : 'cash on delivery, estimated delivery 4–5 business days';
  return [
    `Thank you ${order.customer.name}! Your HERENCIA order ${order.orderNumber} has been received.`,
    '',
    `Items: ${items}`,
    `Total: ${order.total.toLocaleString('en-EG')} EGP`,
    `Payment: ${payment}`,
    '',
    "We'll keep you posted here.",
  ].join('\n');
}

export function statusMessage(order: OrderDTO): string {
  return `Hi ${order.customer.name}, an update on your HERENCIA order ${order.orderNumber}: it ${STATUS_PHRASE[order.status]}.`;
}

export function customerWhatsAppUrl(phone: string, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

/**
 * Asks a delivered customer for a review.
 *
 * Includes the order number because the review form needs it as proof of purchase —
 * the customer has no account, so that number plus their phone is how the site
 * verifies they actually bought the perfume.
 */
export function reviewRequestMessage(order: OrderDTO, siteUrl: string): string {
  const first = (order.customer.name ?? '').trim().split(/\s+/)[0] || 'there';
  const item = order.items.find((i) => !i.isSample) ?? order.items[0];
  const lines = [
    `Hi ${first}, thank you for your order from HERENCIA.`,
    '',
    item ? `How are you finding ${item.name}?` : 'How are you finding your order?',
    'If you have a moment, a short review really helps other customers choose.',
    '',
    `Leave one here: ${siteUrl}/products`,
    `Your order number: ${order.orderNumber}`,
    '(You will need it plus this phone number to confirm the purchase.)',
  ];
  return lines.join('\n');
}
