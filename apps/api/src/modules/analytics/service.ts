import type { TrackBatchInput } from '@herencia/shared';
import { Event } from '../../models/Event';
import { Session } from '../../models/Session';
import { Product } from '../../models/Product';
import { isBot, deviceFrom } from '../../lib/userAgent';

/**
 * Writes one batch of tracked events.
 *
 * The server is authoritative for everything that could be gamed: product ids are
 * resolved from slugs, monetary values are read from the catalog, and bot/device
 * classification comes from the user-agent. The request body only supplies the
 * shape of the navigation.
 */
export async function ingestBatch(input: TrackBatchInput, ua: string | undefined): Promise<void> {
  const { session, events } = input;

  // $setOnInsert for the landing facts: a later batch in the same visit must not
  // overwrite the campaign that brought the visitor in.
  await Session.updateOne(
    { sessionId: session.sessionId },
    {
      $setOnInsert: {
        visitorId: session.visitorId,
        landingPath: session.landingPath,
        referrer: session.referrer,
        utm: session.utm ?? {},
        device: deviceFrom(ua),
        isBot: isBot(ua),
        startedAt: new Date(),
        createdAt: new Date(),
      },
      $set: { lastSeenAt: new Date() },
    },
    { upsert: true },
  );

  const slugs = [...new Set(events.map((e) => e.productSlug).filter((s): s is string => !!s))];
  const products = slugs.length
    ? await Product.find({ slug: { $in: slugs }, isActive: true }).select('slug basePrice').lean()
    : [];
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const docs = events.flatMap((e) => {
    const product = e.productSlug ? bySlug.get(e.productSlug) : undefined;
    // An event naming a product we cannot resolve is noise — drop it rather than
    // store a dangling reference every future report would have to defend against.
    if (e.productSlug && !product) return [];
    return [
      {
        type: e.type,
        sessionId: session.sessionId,
        visitorId: session.visitorId,
        path: e.path,
        product: product?._id,
        value: e.type === 'add_to_cart' ? product?.basePrice : undefined,
        createdAt: new Date(),
      },
    ];
  });

  if (docs.length) await Event.insertMany(docs, { ordered: false });
}

/** Called by createOrder — the purchase event is server-side, never client-reported. */
export async function recordPurchase(args: {
  sessionId?: string;
  visitorId?: string;
  orderNumber: string;
  total: number;
}): Promise<void> {
  if (!args.sessionId || !args.visitorId) return;
  await Event.create({
    type: 'purchase',
    sessionId: args.sessionId,
    visitorId: args.visitorId,
    path: '/checkout',
    orderNumber: args.orderNumber,
    value: args.total,
    createdAt: new Date(),
  });
}
