import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Ensure we load .env from the workspace root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../../../.env") });

const configSchema = z.object({
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  TIKTOK_SHOP_API_BASE_URL: z.string().url(),
  TIKTOK_SHOP_TOKEN_URL: z.string().url(),
  TIKTOK_SHOP_APP_KEY: z.string().min(1),
  TIKTOK_SHOP_APP_SECRET: z.string().min(1),
  TIKTOK_SHOP_AUTH_REVOKED_EVENT: z.string().default("AUTHORIZATION_REVOKED"),
  TIKTOK_SHOP_INVENTORY_UPDATE_PATH: z.string().default("/product/inventory/update"),
});

export const config = configSchema.parse(process.env);
