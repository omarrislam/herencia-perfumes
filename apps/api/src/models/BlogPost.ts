import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const blogPostSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true },
    body: { type: String, required: true },
    coverImage: { type: String, required: true },
    tags: { type: [String], default: [], index: true },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    seo: { title: { type: String }, description: { type: String } },
  },
  { timestamps: true },
);

export type BlogPostDoc = InferSchemaType<typeof blogPostSchema>;
export const BlogPost =
  (mongoose.models.BlogPost as mongoose.Model<BlogPostDoc>) ?? mongoose.model('BlogPost', blogPostSchema);
