import type { ProductDTO, ScentFamilyDTO, UserDTO, OrderDTO } from '@herencia/shared';

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
    total: doc.total,
    status: doc.status,
    paymentMethod: 'cod',
    notes: doc.notes ?? undefined,
    createdAt: (doc.createdAt instanceof Date
      ? doc.createdAt
      : new Date(doc.createdAt)
    ).toISOString(),
  };
}
