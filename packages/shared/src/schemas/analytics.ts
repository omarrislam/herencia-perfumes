import { z } from 'zod';

export const EVENT_TYPES = [
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout_started',
  'purchase',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const shortText = z.string().trim().max(500);

// NOTE: `value` is deliberately absent. Monetary amounts are looked up from the
// database server-side; a client-supplied value would be trivially spoofable.
// Zod strips unknown keys by default, so a client that sends one is ignored —
// as is any PII a client has no business attaching to an analytics event.
export const trackEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  path: shortText,
  productSlug: z.string().trim().max(200).optional(),
});

export const trackSessionSchema = z.object({
  sessionId: z.string().trim().min(1).max(64),
  visitorId: z.string().trim().min(1).max(64),
  landingPath: shortText,
  referrer: shortText.optional(),
  utm: z
    .object({
      source: shortText.optional(),
      medium: shortText.optional(),
      campaign: shortText.optional(),
      content: shortText.optional(),
      term: shortText.optional(),
    })
    .optional(),
});

export const trackBatchSchema = z.object({
  session: trackSessionSchema,
  // Bounded so one request can never write an unbounded number of documents.
  events: z.array(trackEventSchema).min(1).max(50),
});

export type TrackBatchInput = z.infer<typeof trackBatchSchema>;

/** Marketing attribution copied onto an Order at creation. Outlives the raw-event TTL. */
export type AttributionDTO = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landingPath?: string;
  sessionId?: string;
};
