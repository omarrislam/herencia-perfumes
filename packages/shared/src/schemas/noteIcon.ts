import { z } from 'zod';

// Custom fragrance-note icon uploaded by the admin (built-in icons ship as
// static files in the web app; these override/extend them by note name).
export const noteIconSchema = z.object({
  name: z.string().min(1).max(60),
  image: z.string().min(1).max(300), // Cloudinary publicId
});
export type NoteIconInput = z.infer<typeof noteIconSchema>;

export type NoteIconDTO = {
  id: string;
  name: string;
  image: string;
};
