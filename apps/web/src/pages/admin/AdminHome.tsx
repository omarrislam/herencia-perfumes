import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateSettingsInput, HomeSections, ReorderableSection } from '@herencia/shared';
import { DEFAULT_SECTION_ORDER } from '@herencia/shared';
import { fetchSettings } from '../../lib/api';
import { adminUpdateSettings, uploadImage } from '../../features/admin/adminClient';
import { cld } from '../../lib/cloudinary';
import { ApiError } from '../../lib/api';

type HeroForm = { title: string; subtitle: string; ctaText: string; ctaLink: string; image: string };
const LABELS: Record<keyof HomeSections, { label: string; hint: string }> = {
  hero: { label: 'Hero', hint: 'Main banner at the top (always first)' },
  featured: { label: 'Featured scents', hint: 'Featured products (drawer on mobile)' },
  samples: { label: 'Samples — 3 steps', hint: '“3 Steps to Your Favorite Fragrance” + order-samples CTA' },
  essence: { label: 'Essence', hint: '“Essence of Heritage” editorial split' },
  gifting: { label: 'Gifting band', hint: 'Gift-box banner → bundles' },
  time: { label: 'Time as an Ingredient', hint: '“Patience is our rarest material” statement' },
  testimonials: { label: 'Testimonials', hint: 'Customer quotes' },
  values: { label: 'Values strip', hint: 'Small-batch / COD / free shipping' },
  quiz: { label: 'Quiz CTA', hint: '“Find your signature scent” band' },
  faq: { label: 'FAQ', hint: 'Questions & answers accordion' },
};

export default function AdminHome() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  const [hero, setHero] = useState<HeroForm>({ title: '', subtitle: '', ctaText: '', ctaLink: '', image: '' });
  const [sections, setSections] = useState<HomeSections>({ hero: true, featured: true, samples: true, essence: true, gifting: true, time: true, testimonials: true, values: true, quiz: true, faq: true });
  const [order, setOrder] = useState<ReorderableSection[]>(DEFAULT_SECTION_ORDER);
  const [shipping, setShipping] = useState<{ fee: string; freeOver: string }>({ fee: '', freeOver: '' });
  const [samples, setSamples] = useState({
    price: '60', sizeLabel: '5ml', eyebrow: '', heading: '', strapline: '',
    steps: ['', '', ''] as [string, string, string],
    ctaText: '', stickerTop: '', stickerBottom: '', modalTitle: '', modalText: '',
  });
  const [instapay, setInstapay] = useState<{ enabled: boolean; handle: string; payLink: string }>({ enabled: false, handle: '', payLink: '' });
  const [emailPopup, setEmailPopup] = useState<{ enabled: boolean; title: string; text: string; code: string; discountPercent: string }>({ enabled: false, title: '', text: '', code: '', discountPercent: '10' });
  const [promoBar, setPromoBar] = useState<{ enabled: boolean; text: string; ctaText: string; ctaLink: string }>({ enabled: false, text: '', ctaText: '', ctaLink: '' });
  const [social, setSocial] = useState<{ instagram: string; facebook: string; tiktok: string }>({ instagram: '', facebook: '', tiktok: '' });
  const [contactEmail, setContactEmail] = useState('');
  const [uploading, setUploading] = useState<'hero' | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setHero({ title: s.hero.title, subtitle: s.hero.subtitle, ctaText: s.hero.ctaText, ctaLink: s.hero.ctaLink, image: s.hero.image });
    setSections(s.homeSections);
    setOrder(s.sectionOrder);
    setShipping({ fee: String(s.shippingFee), freeOver: s.freeShippingThreshold != null ? String(s.freeShippingThreshold) : '' });
    setSamples({
      price: String(s.samples.price), sizeLabel: s.samples.sizeLabel, eyebrow: s.samples.eyebrow,
      heading: s.samples.heading, strapline: s.samples.strapline, steps: s.samples.steps,
      ctaText: s.samples.ctaText, stickerTop: s.samples.stickerTop, stickerBottom: s.samples.stickerBottom,
      modalTitle: s.samples.modalTitle, modalText: s.samples.modalText,
    });
    setInstapay({ enabled: s.instapay.enabled, handle: s.instapay.handle ?? '', payLink: s.instapay.payLink ?? '' });
    setEmailPopup({
      enabled: s.emailPopup.enabled,
      title: s.emailPopup.title ?? '',
      text: s.emailPopup.text ?? '',
      code: s.emailPopup.code ?? '',
      discountPercent: s.emailPopup.discountPercent != null ? String(s.emailPopup.discountPercent) : '10',
    });
    setPromoBar({ enabled: s.promoBar.enabled, text: s.promoBar.text ?? '', ctaText: s.promoBar.ctaText ?? '', ctaLink: s.promoBar.ctaLink ?? '' });
    setSocial({ instagram: s.socialLinks?.instagram ?? '', facebook: s.socialLinks?.facebook ?? '', tiktok: s.socialLinks?.tiktok ?? '' });
    setContactEmail(s.contactEmail ?? '');
  }, [settings.data]);

  const move = (i: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const mut = useMutation({
    mutationFn: (input: UpdateSettingsInput) => adminUpdateSettings(input),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const pickImage = async (which: 'hero', file?: File) => {
    if (!file) return;
    setUploading(which);
    setUploadErr(null);
    try {
      const publicId = await uploadImage(file);
      setHero((h) => ({ ...h, image: publicId }));
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const save = () => {
    mut.mutate({
      hero,
      homeSections: sections,
      sectionOrder: order,
      ...(shipping.fee.trim() !== '' && Number(shipping.fee) >= 0 ? { shippingFee: Number(shipping.fee) } : {}),
      ...(shipping.freeOver.trim() !== '' && Number(shipping.freeOver) >= 0 ? { freeShippingThreshold: Number(shipping.freeOver) } : {}),
      samples: {
        ...(Number(samples.price) > 0 ? { price: Number(samples.price) } : {}),
        sizeLabel: samples.sizeLabel || undefined,
        eyebrow: samples.eyebrow || undefined,
        heading: samples.heading || undefined,
        strapline: samples.strapline || undefined,
        steps: samples.steps.every((x) => x.trim()) ? samples.steps : undefined,
        ctaText: samples.ctaText || undefined,
        stickerTop: samples.stickerTop || undefined,
        stickerBottom: samples.stickerBottom || undefined,
        modalTitle: samples.modalTitle || undefined,
        modalText: samples.modalText || undefined,
      },
      instapay: {
        enabled: instapay.enabled,
        handle: instapay.handle || undefined,
        payLink: instapay.payLink || undefined,
      },
      emailPopup: {
        enabled: emailPopup.enabled,
        title: emailPopup.title || undefined,
        text: emailPopup.text || undefined,
        code: emailPopup.code.trim().toUpperCase() || undefined,
        discountPercent: Number(emailPopup.discountPercent) > 0 ? Number(emailPopup.discountPercent) : undefined,
      },
      promoBar: {
        enabled: promoBar.enabled,
        text: promoBar.text || undefined,
        ctaText: promoBar.ctaText || undefined,
        ctaLink: promoBar.ctaLink || undefined,
      },
      socialLinks: {
        instagram: social.instagram || undefined,
        facebook: social.facebook || undefined,
        tiktok: social.tiktok || undefined,
      },
      contactEmail: contactEmail.trim() || undefined,
    });
  };

  if (settings.isLoading) return <p className="font-body text-muted">Loading…</p>;
  if (settings.isError) return <p className="font-body text-danger">Failed to load settings.</p>;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-display text-2xl text-content">Home page</h1>

      {/* Hero */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">Hero</h2>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Title</span>
          <input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Subtitle</span>
          <input value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} className="field-lux" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Button text</span>
            <input value={hero.ctaText} onChange={(e) => setHero({ ...hero, ctaText: e.target.value })} className="field-lux" />
          </label>
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Button link</span>
            <input value={hero.ctaLink} onChange={(e) => setHero({ ...hero, ctaLink: e.target.value })} className="field-lux" />
          </label>
        </div>
        <div>
          <span className="mb-1 block font-body text-sm text-muted">Hero image</span>
          <div className="flex items-center gap-3">
            {hero.image && <img src={cld(hero.image, { w: 160 })} alt="" className="h-16 w-24 rounded object-cover" />}
            <input type="file" accept="image/*" onChange={(e) => void pickImage('hero', e.target.files?.[0])} disabled={uploading === 'hero'} className="font-body text-sm text-content" />
            {uploading === 'hero' && <span className="font-body text-xs text-muted">Uploading…</span>}
          </div>
        </div>
      </section>

      {/* Sections: show/hide + reorder */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-3">
        <h2 className="font-display text-lg text-content">Sections</h2>
        <p className="font-body text-sm text-muted">Show/hide each block and use ▲▼ to reorder. (Hero is always first.)</p>

        {/* Hero — fixed position, toggle only */}
        <label className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5">
          <span>
            <span className="font-body text-sm text-content">{LABELS.hero.label}</span>
            <span className="block font-body text-xs text-muted">{LABELS.hero.hint}</span>
          </span>
          <input type="checkbox" checked={sections.hero} onChange={(e) => setSections({ ...sections, hero: e.target.checked })} className="h-4 w-4" />
        </label>

        {/* Reorderable sections */}
        {order.map((key, i) => (
          <div key={key} className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2.5">
            <div className="flex flex-col leading-none">
              <button type="button" aria-label={`Move ${LABELS[key].label} up`} disabled={i === 0} onClick={() => move(i, -1)} className="px-1 text-content hover:text-accent disabled:opacity-30">▲</button>
              <button type="button" aria-label={`Move ${LABELS[key].label} down`} disabled={i === order.length - 1} onClick={() => move(i, 1)} className="px-1 text-content hover:text-accent disabled:opacity-30">▼</button>
            </div>
            <span className="flex-1">
              <span className="font-body text-sm text-content">{LABELS[key].label}</span>
              <span className="block font-body text-xs text-muted">{LABELS[key].hint}</span>
            </span>
            <input type="checkbox" checked={sections[key]} onChange={(e) => setSections({ ...sections, [key]: e.target.checked })} className="h-4 w-4" />
          </div>
        ))}
      </section>

      {/* Promo bar (above the navbar) */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">Promo bar</h2>
        <p className="font-body text-sm text-muted">A black announcement bar shown above the navbar on every page.</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={promoBar.enabled} onChange={(e) => setPromoBar({ ...promoBar, enabled: e.target.checked })} className="h-4 w-4" />
          <span className="font-body text-sm text-content">Show the promo bar</span>
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Message</span>
          <input value={promoBar.text} onChange={(e) => setPromoBar({ ...promoBar, text: e.target.value })} placeholder="Free shipping on orders over 2,000 EGP" className="field-lux" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Link text (optional)</span>
            <input value={promoBar.ctaText} onChange={(e) => setPromoBar({ ...promoBar, ctaText: e.target.value })} placeholder="Shop now" className="field-lux" />
          </label>
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Link URL (optional)</span>
            <input value={promoBar.ctaLink} onChange={(e) => setPromoBar({ ...promoBar, ctaLink: e.target.value })} placeholder="/products" className="field-lux" />
          </label>
        </div>
      </section>

      {/* Social links */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">Social links</h2>
        <p className="font-body text-sm text-muted">Shown as icons in the footer. Leave blank to hide (WhatsApp uses your store number).</p>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Instagram URL</span>
          <input value={social.instagram} onChange={(e) => setSocial({ ...social, instagram: e.target.value })} placeholder="https://instagram.com/yourhandle" className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Facebook URL</span>
          <input value={social.facebook} onChange={(e) => setSocial({ ...social, facebook: e.target.value })} placeholder="https://facebook.com/yourpage" className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">TikTok URL</span>
          <input value={social.tiktok} onChange={(e) => setSocial({ ...social, tiktok: e.target.value })} placeholder="https://tiktok.com/@yourhandle" className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Contact email (footer &ldquo;Contact&rdquo; link)</span>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@yourdomain.com" className="field-lux" />
        </label>
      </section>

      {/* Shipping */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">Shipping</h2>
        <p className="font-body text-sm text-muted">Applied to every order at checkout. The free-shipping bar in the cart uses the threshold.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Shipping fee (EGP)</span>
            <input type="number" min="0" value={shipping.fee} onChange={(e) => setShipping({ ...shipping, fee: e.target.value })} className="field-lux" />
          </label>
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Free shipping over (EGP)</span>
            <input type="number" min="0" value={shipping.freeOver} onChange={(e) => setShipping({ ...shipping, freeOver: e.target.value })} className="field-lux" />
          </label>
        </div>
      </section>

      {/* Samples */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">Samples</h2>
        <p className="font-body text-sm text-muted">
          Per-perfume availability is set on each perfume in Products (Sample stock). <code>{'{price}'}</code> and{' '}
          <code>{'{size}'}</code> are replaced automatically.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Price (EGP)</span>
            <input type="number" min="0" value={samples.price} onChange={(e) => setSamples({ ...samples, price: e.target.value })} className="field-lux" />
          </label>
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Size label</span>
            <input value={samples.sizeLabel} onChange={(e) => setSamples({ ...samples, sizeLabel: e.target.value })} placeholder="5ml" className="field-lux" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Eyebrow</span>
          <input value={samples.eyebrow} onChange={(e) => setSamples({ ...samples, eyebrow: e.target.value })} placeholder="Try before you commit" className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Heading <span className="text-xs">(line break = new line)</span></span>
          <textarea value={samples.heading} onChange={(e) => setSamples({ ...samples, heading: e.target.value })} rows={2} placeholder={'Samples first.\nBottles later.'} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Strapline</span>
          <input value={samples.strapline} onChange={(e) => setSamples({ ...samples, strapline: e.target.value })} placeholder="Any scent · {size} vial · {price} each — credited back when you buy the bottle." className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Step 1</span>
          <input value={samples.steps[0]} onChange={(e) => setSamples({ ...samples, steps: [e.target.value, samples.steps[1], samples.steps[2]] })} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Step 2</span>
          <input value={samples.steps[1]} onChange={(e) => setSamples({ ...samples, steps: [samples.steps[0], e.target.value, samples.steps[2]] })} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Step 3</span>
          <input value={samples.steps[2]} onChange={(e) => setSamples({ ...samples, steps: [samples.steps[0], samples.steps[1], e.target.value] })} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Button text</span>
          <input value={samples.ctaText} onChange={(e) => setSamples({ ...samples, ctaText: e.target.value })} placeholder="Order samples · {price} each" className="field-lux" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Sticker top</span>
            <input value={samples.stickerTop} onChange={(e) => setSamples({ ...samples, stickerTop: e.target.value })} placeholder="{size} from" className="field-lux" />
          </label>
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Sticker bottom</span>
            <input value={samples.stickerBottom} onChange={(e) => setSamples({ ...samples, stickerBottom: e.target.value })} placeholder="per sample" className="field-lux" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Modal title</span>
          <input value={samples.modalTitle} onChange={(e) => setSamples({ ...samples, modalTitle: e.target.value })} placeholder="Order samples" className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Modal text</span>
          <textarea value={samples.modalText} onChange={(e) => setSamples({ ...samples, modalText: e.target.value })} rows={2} placeholder="Pick as many as you like · {size} each · {price} per sample. The value is credited when you buy the bottle." className="field-lux" />
        </label>
      </section>

      {/* InstaPay */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">InstaPay</h2>
        <p className="font-body text-sm text-muted">Payment details are shown only after the customer places the order.</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={instapay.enabled} onChange={(e) => setInstapay({ ...instapay, enabled: e.target.checked })} className="h-4 w-4" />
          <span className="font-body text-sm text-content">Offer InstaPay at checkout</span>
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">InstaPay handle / address</span>
          <input value={instapay.handle} onChange={(e) => setInstapay({ ...instapay, handle: e.target.value })} placeholder="omarislamelsady@instapay" className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Payment link (shown on the order-confirmation page)</span>
          <input value={instapay.payLink} onChange={(e) => setInstapay({ ...instapay, payLink: e.target.value })} placeholder="https://ipn.eg/S/yourname/instapay/XXXX" className="field-lux" />
        </label>
      </section>

      {/* Email discount popup */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg text-content">Email discount popup</h2>
        <p className="font-body text-sm text-muted">A popup invites visitors to leave their email for a discount code. The code is applied automatically at checkout.</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={emailPopup.enabled} onChange={(e) => setEmailPopup({ ...emailPopup, enabled: e.target.checked })} className="h-4 w-4" />
          <span className="font-body text-sm text-content">Show the popup</span>
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Title</span>
          <input value={emailPopup.title} onChange={(e) => setEmailPopup({ ...emailPopup, title: e.target.value })} placeholder="Take 10% off your first order" className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Message</span>
          <input value={emailPopup.text} onChange={(e) => setEmailPopup({ ...emailPopup, text: e.target.value })} placeholder="Join the maison — your discount is applied automatically at checkout." className="field-lux" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Discount code</span>
            <input value={emailPopup.code} onChange={(e) => setEmailPopup({ ...emailPopup, code: e.target.value })} placeholder="WELCOME10" className="field-lux" />
          </label>
          <label className="block">
            <span className="mb-1 block font-body text-sm text-muted">Discount %</span>
            <input type="number" min={1} max={90} value={emailPopup.discountPercent} onChange={(e) => setEmailPopup({ ...emailPopup, discountPercent: e.target.value })} className="field-lux" />
          </label>
        </div>
      </section>

      {uploadErr && <p className="font-body text-sm text-danger">{uploadErr}</p>}
      {mut.isError && (
        <p className="font-body text-sm text-danger">
          {mut.error instanceof ApiError ? `Error ${mut.error.status}: ${mut.error.message}` : 'Save failed.'}
        </p>
      )}
      {saved && <p className="font-body text-sm text-success">Saved.</p>}

      <button type="button" onClick={save} disabled={mut.isPending || uploading !== null} className="btn-lux disabled:opacity-50">
        {mut.isPending ? 'Saving…' : 'Save home page'}
      </button>
    </div>
  );
}
