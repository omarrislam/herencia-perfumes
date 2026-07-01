import { z } from 'zod';

export const blogPostSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().optional(),
  excerpt: z.string().trim().min(1).max(300),
  body: z.string().min(1),
  coverImage: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).default([]),
  isPublished: z.boolean().default(false),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).default({}),
});
export type BlogPostInput = z.infer<typeof blogPostSchema>;

export type BlogPostDTO = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: string;
  seo: { title?: string; description?: string };
  createdAt: string;
};
export type BlogPostListItemDTO = Omit<BlogPostDTO, 'body'>;
export type BlogListDTO = { items: BlogPostListItemDTO[]; total: number; page: number; pages: number };
