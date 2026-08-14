import type { ProductDTO, ScentFamilyDTO, UserDTO, OrderDTO, AddressDTO, ReviewDTO, QuizQuestionPublicDTO, QuizQuestionAdminDTO, BannerDTO, BlogPostDTO, BlogPostListItemDTO, SettingDTO, ReorderableSection, SubscriberDTO, DiscountCodeDTO } from '@herencia/shared';
import { DEFAULT_HOME_SECTIONS, DEFAULT_SECTION_ORDER, REORDERABLE_SECTIONS, DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';

function normalizeSectionOrder(raw: unknown): ReorderableSection[] {
  // Orders saved before the 'samples' section existed predate the sales-first
  // layout — serve the new default until the admin saves a fresh order.
  if (!Array.isArray(raw) || !raw.includes('samples')) return [...DEFAULT_SECTION_ORDER];
  const valid = new Set<string>(REORDERABLE_SECTIONS);
  const seen = new Set<string>();
  const out: ReorderableSection[] = [];
  for (const k of raw) {
    if (typeof k === 'string' && valid.has(k) && !seen.has(k)) {
      seen.add(k);
      out.push(k as ReorderableSection);
    }
  }
  for (const k of DEFAULT_SECTION_ORDER) if (!seen.has(k)) out.push(k);
  return out;
}

export function toSettingDTO(doc: AnyDoc): SettingDTO {
  const hs = doc.homeSections ?? {};
  return {
    whatsappNumber: doc.whatsappNumber,
    shippingFee: doc.shippingFee ?? 0,
    freeShippingThreshold: doc.freeShippingThreshold ?? undefined,
    socialLinks: doc.socialLinks ?? {},
    hero: doc.hero,
    homeSections: {
      hero: hs.hero ?? DEFAULT_HOME_SECTIONS.hero,
      featured: hs.featured ?? DEFAULT_HOME_SECTIONS.featured,
      samples: hs.samples ?? DEFAULT_HOME_SECTIONS.samples,
      essence: hs.essence ?? DEFAULT_HOME_SECTIONS.essence,
      gifting: hs.gifting ?? DEFAULT_HOME_SECTIONS.gifting,
      time: hs.time ?? DEFAULT_HOME_SECTIONS.time,
      testimonials: hs.testimonials ?? DEFAULT_HOME_SECTIONS.testimonials,
      values: hs.values ?? DEFAULT_HOME_SECTIONS.values,
      quiz: hs.quiz ?? DEFAULT_HOME_SECTIONS.quiz,
      faq: hs.faq ?? DEFAULT_HOME_SECTIONS.faq,
    },
    sectionOrder: normalizeSectionOrder(doc.sectionOrder),
    instapay: {
      enabled: doc.instapay?.enabled ?? false,
      handle: doc.instapay?.handle ?? undefined,
      payLink: doc.instapay?.payLink ?? undefined,
      qrImage: doc.instapay?.qrImage ?? undefined,
    },
    emailPopup: {
      enabled: doc.emailPopup?.enabled ?? false,
      title: doc.emailPopup?.title ?? undefined,
      text: doc.emailPopup?.text ?? undefined,
      code: doc.emailPopup?.code ?? undefined,
      discountPercent: doc.emailPopup?.discountPercent ?? undefined,
    },
    promoBar: {
      enabled: doc.promoBar?.enabled ?? false,
      text: doc.promoBar?.text ?? undefined,
      ctaText: doc.promoBar?.ctaText ?? undefined,
      ctaLink: doc.promoBar?.ctaLink ?? undefined,
    },
    samples: {
      price: doc.samples?.price ?? DEFAULT_SAMPLES_SETTINGS.price,
      sizeLabel: doc.samples?.sizeLabel ?? DEFAULT_SAMPLES_SETTINGS.sizeLabel,
      eyebrow: doc.samples?.eyebrow ?? DEFAULT_SAMPLES_SETTINGS.eyebrow,
      heading: doc.samples?.heading ?? DEFAULT_SAMPLES_SETTINGS.heading,
      strapline: doc.samples?.strapline ?? DEFAULT_SAMPLES_SETTINGS.strapline,
      steps:
        Array.isArray(doc.samples?.steps) && doc.samples.steps.length === 3
          ? (doc.samples.steps as [string, string, string])
          : DEFAULT_SAMPLES_SETTINGS.steps,
      ctaText: doc.samples?.ctaText ?? DEFAULT_SAMPLES_SETTINGS.ctaText,
      stickerTop: doc.samples?.stickerTop ?? DEFAULT_SAMPLES_SETTINGS.stickerTop,
      stickerBottom: doc.samples?.stickerBottom ?? DEFAULT_SAMPLES_SETTINGS.stickerBottom,
      modalTitle: doc.samples?.modalTitle ?? DEFAULT_SAMPLES_SETTINGS.modalTitle,
      modalText: doc.samples?.modalText ?? DEFAULT_SAMPLES_SETTINGS.modalText,
    },
    contactEmail: doc.contactEmail ?? undefined,
  };
}

// `doc` is a lean Mongoose document whose shape varies (populated vs. raw refs);
// `any` is intentional here so the mapper can read arbitrary nested fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function toScentFamilyDTO(doc: AnyDoc): ScentFamilyDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? undefined,
    order: doc.order ?? 0,
  };
}

export function toProductDTO(doc: AnyDoc, opts: { populateBundle?: boolean } = {}): ProductDTO {
  const fam = doc.scentFamily && typeof doc.scentFamily === 'object' && doc.scentFamily._id
    ? toScentFamilyDTO(doc.scentFamily)
    : null;
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    type: doc.type,
    shortDesc: doc.shortDesc,
    description: doc.description,
    images: doc.images ?? [],
    sizes: (doc.sizes ?? []).map((s: AnyDoc) => ({
      label: s.label,
      price: s.price,
      compareAtPrice: s.compareAtPrice ?? undefined,
      stock: s.stock,
    })),
    basePrice: doc.basePrice,
    sampleStock: doc.sampleStock ?? 0,
    scentFamily: fam,
    notes: { top: doc.notes?.top ?? [], heart: doc.notes?.heart ?? [], base: doc.notes?.base ?? [] },
    gender: doc.gender,
    concentration: doc.concentration,
    rating: { avg: doc.rating?.avg ?? 0, count: doc.rating?.count ?? 0 },
    isFeatured: !!doc.isFeatured,
    isActive: !!doc.isActive,
    seo: { title: doc.seo?.title ?? undefined, description: doc.seo?.description ?? undefined },
    bundleItems: doc.bundleItems?.map((b: AnyDoc) => ({
      product:
        opts.populateBundle && b.product && typeof b.product === 'object' && b.product._id
          ? toProductDTO(b.product)
          : String(b.product),
      qty: b.qty,
    })),
  };
}

export function toUserDTO(doc: AnyDoc): UserDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    phone: doc.phone ?? undefined,
  };
}

export function toAddressDTO(a: AnyDoc): AddressDTO {
  return {
    id: String(a._id),
    label: a.label, line1: a.line1, line2: a.line2 ?? undefined,
    city: a.city, governorate: a.governorate, phone: a.phone, isDefault: !!a.isDefault,
  };
}

export function toReviewDTO(doc: AnyDoc): ReviewDTO {
  const u = doc.user && typeof doc.user === 'object' && doc.user._id ? doc.user : null;
  // A verified-guest review has no account — it carries a first name taken from the
  // order instead, and is flagged so the UI can say "verified buyer".
  const guest = !doc.user && doc.orderNumber;
  return {
    id: String(doc._id),
    productId: String(doc.product),
    user: guest
      ? { name: doc.guestName || 'Customer' }
      : { id: String(u ? u._id : doc.user), name: u?.name ?? 'Customer' },
    ...(guest ? { verifiedBuyer: true } : {}),
    rating: doc.rating,
    title: doc.title ?? undefined,
    body: doc.body,
    isApproved: !!doc.isApproved,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
  };
}

export function toQuizQuestionPublicDTO(doc: AnyDoc): QuizQuestionPublicDTO {
  return {
    id: String(doc._id),
    order: doc.order ?? 0,
    question: doc.question,
    answers: (doc.answers ?? []).map((a: AnyDoc) => ({ label: a.label })),
  };
}

export function toQuizQuestionAdminDTO(doc: AnyDoc): QuizQuestionAdminDTO {
  return {
    id: String(doc._id),
    order: doc.order ?? 0,
    question: doc.question,
    answers: (doc.answers ?? []).map((a: AnyDoc) => ({
      label: a.label,
      weights: {
        scentFamily: a.weights?.scentFamily ? String(a.weights.scentFamily) : undefined,
        gender: a.weights?.gender ?? undefined,
        value: a.weights?.value ?? 1,
      },
    })),
  };
}

export function toNoteIconDTO(doc: AnyDoc): { id: string; name: string; image: string } {
  return { id: String(doc._id), name: doc.name, image: doc.image };
}

export function toBannerDTO(doc: AnyDoc): BannerDTO {
  const iso = (d: unknown) => (d ? (d instanceof Date ? d : new Date(d as string)).toISOString() : undefined);
  return {
    id: String(doc._id),
    title: doc.title,
    subtitle: doc.subtitle ?? undefined,
    image: doc.image,
    ctaText: doc.ctaText ?? undefined,
    ctaLink: doc.ctaLink ?? undefined,
    placement: doc.placement,
    startsAt: iso(doc.startsAt),
    endsAt: iso(doc.endsAt),
    isActive: !!doc.isActive,
    order: doc.order ?? 0,
  };
}

export function toOrderDTO(doc: AnyDoc): OrderDTO {
  return {
    id: String(doc._id),
    orderNumber: doc.orderNumber,
    items: (doc.items ?? []).map((i: AnyDoc) => ({
      product: String(i.product),
      name: i.name,
      sizeLabel: i.sizeLabel,
      unitPrice: i.unitPrice,
      qty: i.qty,
      image: i.image ?? '',
      isSample: i.isSample ? true : undefined,
    })),
    customer: {
      name: doc.customer.name,
      phone: doc.customer.phone,
      email: doc.customer.email ?? undefined,
    },
    shippingAddress: {
      line1: doc.shippingAddress.line1,
      line2: doc.shippingAddress.line2 ?? undefined,
      city: doc.shippingAddress.city,
      governorate: doc.shippingAddress.governorate,
      phone: doc.shippingAddress.phone,
    },
    subtotal: doc.subtotal,
    shipping: doc.shipping,
    discount: doc.discount ?? 0,
    discountCode: doc.discountCode ?? undefined,
    total: doc.total,
    status: doc.status,
    paymentMethod: doc.paymentMethod ?? 'cod',
    paidAt: doc.paidAt ? new Date(doc.paidAt).toISOString() : undefined,
    statusHistory: (doc.statusHistory ?? []).map((h: AnyDoc) => ({
      status: h.status,
      at: new Date(h.at).toISOString(),
    })),
    notes: doc.notes ?? undefined,
    attribution: doc.attribution
      ? {
          source: doc.attribution.source ?? undefined,
          medium: doc.attribution.medium ?? undefined,
          campaign: doc.attribution.campaign ?? undefined,
          referrer: doc.attribution.referrer ?? undefined,
          landingPath: doc.attribution.landingPath ?? undefined,
          sessionId: doc.attribution.sessionId ?? undefined,
        }
      : undefined,
    createdAt: (doc.createdAt instanceof Date
      ? doc.createdAt
      : new Date(doc.createdAt)
    ).toISOString(),
  };
}

export function toBlogPostDTO(doc: AnyDoc): BlogPostDTO {
  const iso = (d: unknown) => (d ? (d instanceof Date ? d : new Date(d as string)).toISOString() : undefined);
  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    body: doc.body,
    coverImage: doc.coverImage,
    tags: doc.tags ?? [],
    isPublished: !!doc.isPublished,
    publishedAt: iso(doc.publishedAt),
    seo: { title: doc.seo?.title ?? undefined, description: doc.seo?.description ?? undefined },
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
  };
}

export function toBlogListItemDTO(doc: AnyDoc): BlogPostListItemDTO {
  const { body, ...rest } = toBlogPostDTO(doc);
  void body;
  return rest;
}

export function toSubscriberDTO(doc: AnyDoc): SubscriberDTO {
  return {
    id: String(doc._id),
    email: doc.email,
    source: doc.source ?? 'popup',
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
  };
}

export function toDiscountCodeDTO(doc: AnyDoc): DiscountCodeDTO {
  return {
    id: String(doc._id),
    code: doc.code,
    percent: doc.percent,
    isActive: !!doc.isActive,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : undefined,
    uses: doc.uses ?? 0,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
  };
}
