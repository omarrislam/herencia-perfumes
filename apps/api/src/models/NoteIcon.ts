import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// Admin-uploaded fragrance-note icon (name is matched case-insensitively on
// the storefront; built-in icons are static files in the web app).
const noteIconSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, required: true },
  },
  { timestamps: true },
);

export type NoteIconDoc = InferSchemaType<typeof noteIconSchema>;
export const NoteIcon =
  (mongoose.models.NoteIcon as mongoose.Model<NoteIconDoc>) ??
  mongoose.model('NoteIcon', noteIconSchema);
