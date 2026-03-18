import "dotenv/config";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import fastify from "fastify";
import sensible from "@fastify/sensible";
import rawBody from "fastify-raw-body";
import {
  prisma,
  upsertSocialAccountTokens,
  upsertWebhookEvent,
} from "@neomello/db";
import { config } from "./config.js";
import { decodeOAuthState, encodeOAuthState } from "./oauth-state.js";
import { exchangeCodeForTokens } from "./tiktok-shop.js";

const app = fastify({
  logger: true,
});

await app.register(rawBody, {
  field: "rawBody",
  global: false,
  encoding: "utf8",
  runFirst: true,
});

await app.register(sensible);

app.get("/health", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true };
});

app.get("/oauth/tiktok-shop/authorize", async (request) => {
  const query = request.query as Record<string, string | undefined>;

  if (!query.workspaceId || !query.shopId) {
    throw app.httpErrors.badRequest("workspaceId and shopId are required.");
  }

  const state = encodeOAuthState(config.OAUTH_STATE_SECRET, {
    workspaceId: query.workspaceId,
    shopId: query.shopId,
    provider: query.provider ?? "tiktok_shop",
    ...(query.providerId ? { providerId: query.providerId } : {}),
    ...(query.username ? { username: query.username } : {}),
  });

  const authorizeUrl = new URL(config.TIKTOK_SHOP_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_key", config.TIKTOK_SHOP_APP_KEY);
  authorizeUrl.searchParams.set("redirect_uri", config.TIKTOK_SHOP_REDIRECT_URI);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  return {
    authorizeUrl: authorizeUrl.toString(),
    state,
  };
});

app.get("/oauth/tiktok-shop/callback", async (request) => {
  const query = request.query as Record<string, string | undefined>;

  if (!query.code || !query.state) {
    throw app.httpErrors.badRequest("code and state are required.");
  }

  const state = decodeOAuthState(config.OAUTH_STATE_SECRET, query.state);
  const tokens = await exchangeCodeForTokens({
    tokenUrl: config.TIKTOK_SHOP_TOKEN_URL,
    appKey: config.TIKTOK_SHOP_APP_KEY,
    appSecret: config.TIKTOK_SHOP_APP_SECRET,
    code: query.code,
    redirectUri: config.TIKTOK_SHOP_REDIRECT_URI,
  });

  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const refreshExpiresAt = tokens.refresh_expires_in
    ? new Date(Date.now() + tokens.refresh_expires_in * 1000)
    : undefined;

  const account = await upsertSocialAccountTokens({
    workspaceId: state.workspaceId,
    provider: state.provider,
    shopId: state.shopId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt,
    ...(state.providerId ? { providerId: state.providerId } : {}),
    ...(state.username ? { username: state.username } : {}),
    ...(refreshExpiresAt ? { refreshExpiresAt } : {}),
  });

  return {
    ok: true,
    socialAccountId: account.id,
    shopId: account.shopId,
    tokenExpiresAt: account.tokenExpiresAt.toISOString(),
  };
});

app.post(
  "/webhooks/tiktok-shop",
  {
    config: {
      rawBody: true,
    },
  },
  async (request, reply) => {
    const rawPayload = request.rawBody;

    if (!rawPayload) {
      throw app.httpErrors.badRequest("Missing raw webhook payload.");
    }

    const signatureHeader = request.headers[
      config.TIKTOK_WEBHOOK_SIGNATURE_HEADER
    ] as string | undefined;
    const timestampHeader = request.headers[
      config.TIKTOK_WEBHOOK_TIMESTAMP_HEADER
    ] as string | undefined;

    if (!signatureHeader || !timestampHeader) {
      throw app.httpErrors.unauthorized("Missing webhook signature headers.");
    }

    const computedSignature = createHmac("sha256", config.TIKTOK_WEBHOOK_SECRET)
      .update(`${timestampHeader}.${rawPayload}`)
      .digest("hex");

    const sigBuffer = Buffer.from(signatureHeader, "utf8");
    const expectedBuffer = Buffer.from(computedSignature, "utf8");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw app.httpErrors.unauthorized("Invalid webhook signature.");
    }

    const timestampMs = Number(timestampHeader) * 1000;
    const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;
    if (
      Number.isNaN(timestampMs) ||
      Math.abs(Date.now() - timestampMs) > MAX_WEBHOOK_AGE_MS
    ) {
      throw app.httpErrors.unauthorized("Webhook timestamp expired or invalid.");
    }

    const payload = request.body as {
      event_id?: string;
      type?: string;
      shop_id?: string;
      timestamp?: number;
    };

    if (!payload.type || !payload.shop_id) {
      throw app.httpErrors.badRequest("type and shop_id are required.");
    }

    const account = await prisma.socialAccount.findUnique({
      where: { shopId: payload.shop_id },
    });

    if (!account) {
      throw app.httpErrors.notFound("SocialAccount not found for shop_id.");
    }

    const externalEventId =
      payload.event_id ??
      createHash("sha256")
        .update(
          JSON.stringify({
            shop_id: payload.shop_id,
            type: payload.type,
            timestamp: payload.timestamp ?? null,
            payload,
          }),
        )
        .digest("hex");

    await upsertWebhookEvent({
      socialAccountId: account.id,
      externalEventId,
      eventType: payload.type,
      rawPayload: payload,
    });

    return reply.send({ ok: true });
  },
);

async function gracefulShutdown(signal: string) {
  app.log.info({ signal }, "Received shutdown signal, closing server...");
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

await app.listen({
  host: "0.0.0.0",
  port: config.PORT,
});
