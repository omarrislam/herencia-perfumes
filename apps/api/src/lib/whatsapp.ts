type Summary = {
  orderNumber: string;
  total: number;
  items: { name: string; sizeLabel: string; qty: number }[];
  customer: { name: string };
  paymentMethod?: 'cod' | 'instapay';
};

export function buildWhatsAppUrl(rawNumber: string, order: Summary): string {
  const number = rawNumber.replace(/\D/g, '');
  const method = order.paymentMethod === 'instapay' ? 'InstaPay' : 'Cash on Delivery';
  const lines = [
    `New HERENCIA order ${order.orderNumber}`,
    `Customer: ${order.customer.name}`,
    '',
    ...order.items.map((i) => `• ${i.name} (${i.sizeLabel}) ×${i.qty}`),
    '',
    `Total: EGP ${order.total.toFixed(2)} (${method})`,
  ];
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
}
