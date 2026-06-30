type Summary = {
  orderNumber: string;
  total: number;
  items: { name: string; sizeLabel: string; qty: number }[];
  customer: { name: string };
};

export function buildWhatsAppUrl(rawNumber: string, order: Summary): string {
  const number = rawNumber.replace(/\D/g, '');
  const lines = [
    `New HERENCIA order ${order.orderNumber}`,
    `Customer: ${order.customer.name}`,
    '',
    ...order.items.map((i) => `• ${i.name} (${i.sizeLabel}) ×${i.qty}`),
    '',
    `Total: EGP ${order.total.toFixed(2)} (Cash on Delivery)`,
  ];
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
}
