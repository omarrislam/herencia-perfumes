import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  // One origin, or a comma-separated list (first = canonical, used for SEO).
  CLIENT_ORIGIN: z
    .string()
    .min(1)
    .refine(
      (v) => v.split(',').every((o) => /^https?:\/\/[^\s,/]+$/.test(o.trim())),
      'CLIENT_ORIGIN must be a URL or comma-separated list of URLs',
    ),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  WHATSAPP_NUMBER: z.string().optional(),
  // Official WhatsApp Business Cloud API (docs/18_WHATSAPP_NOTIFICATIONS.md).
  // Notifications are disabled when these are unset.
  WA_PHONE_NUMBER_ID: z.string().optional(),
  WA_ACCESS_TOKEN: z.string().optional(),
  WA_TEMPLATE_LANG: z.string().optional(),
  // ntfy.sh push notification on new order (docs/19_NTFY_NOTIFICATIONS.md).
  // Disabled when NTFY_TOPIC is unset.
  NTFY_TOPIC: z.string().optional(),
  NTFY_SERVER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv | Record<string, unknown>): Env {
  return envSchema.parse(raw);
}
