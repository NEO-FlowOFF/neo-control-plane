import { z } from "zod";

const FETCH_TIMEOUT_MS = 15_000;

const refreshResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.coerce.number().int().positive(),
  refresh_expires_in: z.coerce.number().int().positive().optional(),
});

export async function refreshOAuthTokens(input: {
  tokenUrl: string;
  appKey: string;
  appSecret: string;
  refreshToken: string;
}): Promise<z.infer<typeof refreshResponseSchema>> {
  const body = new URLSearchParams({
    client_key: input.appKey,
    client_secret: input.appSecret,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });

  const response = await fetch(input.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const json = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(`TikTok refresh failed: ${JSON.stringify(json)}`);
  }

  return refreshResponseSchema.parse(json);
}

export async function pushInventoryUpdate(input: {
  apiBaseUrl: string;
  path: string;
  accessToken: string;
  skuId: string;
  quantity: number;
  warehouseId?: string;
}): Promise<void> {
  const url = new URL(input.path, input.apiBaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sku_id: input.skuId,
      quantity: input.quantity,
      warehouse_id: input.warehouseId,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TikTok inventory update failed: ${text}`);
  }
}
