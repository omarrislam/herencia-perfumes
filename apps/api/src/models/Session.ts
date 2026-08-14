import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { RAW_EVENT_TTL_SECONDS } from './Event';

// One document per visit. UTMs live here rather than being repeated on every event.
// Nothing in this schema is PII: no name, phone, or email ever reaches it.
const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    visitorId: { type: String, required: true, index: true },
    utm: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      content: { type: String },
      term: { type: String },
    },
    referrer: { type: String },
    landingPath: { type: String, required: true },
    device: { type: String, enum: ['mobile', 'desktop'], default: 'desktop' },
    isBot: { type: Boolean, default: false, index: true },
    startedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now, expires: RAW_EVENT_TTL_SECONDS },
  },
  { timestamps: false },
);

export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export const Session =
  (mongoose.models.Session as mongoose.Model<SessionDoc>) ?? mongoose.model('Session', sessionSchema);
