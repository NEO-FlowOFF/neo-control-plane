import { z } from "zod";

const configSchema = z.object({
  REDIS_URL: z.string().url(),
  TIKTOK_SHOP_API_BASE_URL: z.string().url(),
  TIKTOK_SHOP_TOKEN_URL: z.string().url(),
  TIKTOK_SHOP_APP_KEY: z.string().min(1),
  TIKTOK_SHOP_APP_SECRET: z.string().min(1),
  TIKTOK_SHOP_AUTH_REVOKED_EVENT: z.string().default("AUTHORIZATION_REVOKED"),
  TIKTOK_SHOP_INVENTORY_UPDATE_PATH: z.string().default("/product/inventory/update"),
});

export const config = configSchema.parse(process.env);
