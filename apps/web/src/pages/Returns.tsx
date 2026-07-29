import { useQuery } from '@tanstack/react-query';
import { fetchSettings } from '../lib/api';
import { useSeo } from '../lib/useSeo';

const POLICY: { q: string; a: string }[] = [
  { q: 'Our promise', a: 'If a fragrance isn’t right for you, we’ll make it right. Unopened items in their original packaging can be returned within 14 days of delivery for a full refund.' },
  { q: 'How to start a return', a: 'Message us on WhatsApp with your order number and reason. We’ll arrange a pickup or drop-off and confirm your refund once the item is received.' },
  { q: 'Opened bottles', a: 'For hygiene, opened perfumes can’t be resold — but if something arrived damaged or wrong, send a photo within 48 hours and we’ll replace it or refund you in full.' },
  { q: 'Refunds', a: 'Cash-on-delivery orders are refunded via InstaPay or bank transfer; InstaPay orders are refunded to the same account. Refunds are processed within 3–5 business days of receiving the return.' },
];

export default function Returns() {
  useSeo({ title: 'Returns & Refunds — HERENCIA', description: 'HERENCIA return and refund policy — 14-day returns on unopened items.' });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60_000 });
  const contactEmail = settings.data?.contactEmail;
  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-8">
        <p className="eyebrow">Good to know</p>
        <h1 className="display mt-2 text-3xl text-content md:text-4xl">Returns &amp; refunds</h1>
        <div className="rule-gold-left mt-4" />
      </div>

      <div className="mb-8 rounded-xl border border-accent/30 bg-accent/10 p-5">
        <p className="font-display text-lg text-content">14‑day returns</p>
        <p className="mt-1 font-body text-sm text-muted">Unopened items can be returned within 14 days of delivery for a full refund.</p>
      </div>

      <div className="divide-y divide-hairline border-y border-hairline">
        {POLICY.map((p) => (
          <div key={p.q} className="py-5">
            <h2 className="font-display text-lg text-content">{p.q}</h2>
            <p className="mt-2 font-body leading-relaxed text-muted">{p.a}</p>
          </div>
        ))}
      </div>

      {contactEmail && (
        <p className="mt-8 font-body text-sm text-muted">
          Questions? <a href={`mailto:${contactEmail}`} className="link-underline text-accent">Email us</a> and we’ll help.
        </p>
      )}
    </div>
  );
}
