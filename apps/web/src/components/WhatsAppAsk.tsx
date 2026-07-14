import { useQuery } from '@tanstack/react-query';
import { fetchSettings } from '../lib/api';

// "Talk to a human" escape hatch next to buy buttons — in the COD market the
// pre-purchase question IS the sale. Renders nothing until settings resolve.
export function WhatsAppAsk({ text, className = '' }: { text?: string; className?: string }) {
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const number = settings.data?.whatsappNumber?.replace(/\D/g, '');
  if (!number) return null;
  const msg = encodeURIComponent(text ?? 'Hi HERENCIA! I have a question.');
  return (
    <p className={`font-body text-xs text-muted ${className}`}>
      Questions?{' '}
      <a
        href={`https://wa.me/${number}?text=${msg}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline-offset-2 hover:underline"
      >
        Chat with us on WhatsApp
      </a>
    </p>
  );
}
