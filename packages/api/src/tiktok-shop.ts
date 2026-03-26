import { createHmac } from "node:crypto";
import { z } from "zod";

const FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_TIKTOK_API_BASE_URL = "https://open-api.tiktokglobalshop.com";

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.coerce.number().int().positive(),
  refresh_expires_in: z.coerce.number().int().positive().optional(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

const authorizedShopSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  cipher: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  region: z.string().optional(),
});

const authorizedShopsResponseSchema = z.object({
  code: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
  data: z
    .object({
      shops: z.array(authorizedShopSchema).default([]),
    })
    .default({ shops: [] }),
});

export type AuthorizedShop = z.infer<typeof authorizedShopSchema>;

function buildTikTokSign(
  apiPath: string,
  queryParams: Record<string, string>,
  bodyText: string,
  secret: string,
): string {
  const filtered = Object.fromEntries(
    Object.entries(queryParams).filter(([key]) => !["access_token", "sign"].includes(key)),
  );
  const ordered = Object.keys(filtered)
    .sort()
    .map((key) => `${key}${filtered[key] ?? ""}`)
    .join("");
  const source = `${secret}${apiPath}${ordered}${bodyText}${secret}`;
  return createHmac("sha256", secret).update(source).digest("hex");
}

export async function exchangeCodeForTokens(input: {
  tokenUrl: string;
  appKey: string;
  appSecret: string;
  code: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_key: input.appKey,
    client_secret: input.appSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
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
    throw new Error(`TikTok token exchange failed: ${JSON.stringify(json)}`);
  }

  return tokenResponseSchema.parse(json);
}

export async function fetchAuthorizedShops(input: {
  apiBaseUrl?: string;
  accessToken: string;
  appKey: string;
  appSecret: string;
}): Promise<AuthorizedShop[]> {
  const apiPath = "/authorization/202309/shops";
  const query = {
    app_key: input.appKey,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const sign = buildTikTokSign(apiPath, query, "", input.appSecret);
  const url = new URL(apiPath, input.apiBaseUrl ?? DEFAULT_TIKTOK_API_BASE_URL);
  url.searchParams.set("app_key", query.app_key);
  url.searchParams.set("timestamp", query.timestamp);
  url.searchParams.set("sign", sign);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": input.accessToken,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const json = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(`TikTok authorized shops failed: ${JSON.stringify(json)}`);
  }

  const payload = authorizedShopsResponseSchema.parse(json);
  return payload.data.shops;
}
