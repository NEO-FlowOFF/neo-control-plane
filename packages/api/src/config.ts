import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().url(),
  TIKTOK_SHOP_APP_KEY: z.string().min(1),
  TIKTOK_SHOP_APP_SECRET: z.string().min(1),
  TIKTOK_SHOP_AUTHORIZE_URL: z.string().url(),
  TIKTOK_SHOP_TOKEN_URL: z.string().url(),
  TIKTOK_SHOP_REDIRECT_URI: z.string().url(),
  OAUTH_STATE_SECRET: z.string().min(16),
  TIKTOK_WEBHOOK_SECRET: z.string().min(1),
  TIKTOK_WEBHOOK_SIGNATURE_HEADER: z.string().default("x-tiktok-signature"),
  TIKTOK_WEBHOOK_TIMESTAMP_HEADER: z.string().default("x-tiktok-timestamp"),
});

export const config = configSchema.parse(process.env);
