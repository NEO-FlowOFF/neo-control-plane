import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

type OAuthStatePayload = {
  workspaceId: string;
  shopId: string;
  provider: string;
  providerId?: string;
  username?: string;
};

type OAuthStateEnvelope = OAuthStatePayload & {
  iat: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeOAuthState(
  secret: string,
  payload: OAuthStatePayload,
): string {
  const envelope: OAuthStateEnvelope = { ...payload, iat: Date.now() };
  const encodedPayload = base64UrlEncode(JSON.stringify(envelope));
  const signature = sign(secret, encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function decodeOAuthState(
  secret: string,
  state: string,
): OAuthStatePayload {
  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("OAuth state has invalid format.");
  }

  const expected = sign(secret, encodedPayload);

  if (
    !timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8"),
    )
  ) {
    throw new Error("OAuth state signature mismatch.");
  }

  const envelope = JSON.parse(base64UrlDecode(encodedPayload)) as OAuthStateEnvelope;

  if (
    typeof envelope.iat !== "number" ||
    Date.now() - envelope.iat > STATE_MAX_AGE_MS
  ) {
    throw new Error("OAuth state has expired.");
  }

  const { iat: _iat, ...payload } = envelope;
  return payload;
}

export type { OAuthStatePayload };
