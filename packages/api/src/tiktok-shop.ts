import { z } from "zod";

const FETCH_TIMEOUT_MS = 15_000;

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.coerce.number().int().positive(),
  refresh_expires_in: z.coerce.number().int().positive().optional(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

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
