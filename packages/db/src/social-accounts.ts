import {
  InboxStatus,
  SocialAccountStatus,
  type Prisma,
  type SocialAccount,
  type WebhookEventInbox,
} from "../generated/client/index.js";
import { prisma } from "./client.js";
import { openSecret, sealSecret } from "./crypto.js";

export type UpsertSocialAccountTokensInput = {
  workspaceId: string;
  provider: string;
  providerId?: string;
  shopId: string;
  username?: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  refreshExpiresAt?: Date;
};

export type DecryptedSocialAccount = Omit<SocialAccount, "accessToken" | "refreshToken"> & {
  accessToken: string;
  refreshToken: string;
};

function decryptAccount(account: SocialAccount): DecryptedSocialAccount {
  return {
    ...account,
    accessToken: openSecret(account.accessToken),
    refreshToken: openSecret(account.refreshToken),
  };
}

export async function upsertSocialAccountTokens(
  input: UpsertSocialAccountTokensInput,
): Promise<DecryptedSocialAccount> {
  const createData = {
    workspaceId: input.workspaceId,
    provider: input.provider,
    shopId: input.shopId,
    accessToken: sealSecret(input.accessToken),
    refreshToken: sealSecret(input.refreshToken),
    tokenExpiresAt: input.tokenExpiresAt,
    status: SocialAccountStatus.ACTIVE,
    failureCount: 0,
    lastRefreshedAt: new Date(),
    ...(input.providerId ? { providerId: input.providerId } : {}),
    ...(input.username ? { username: input.username } : {}),
    ...(input.refreshExpiresAt ? { refreshExpiresAt: input.refreshExpiresAt } : {}),
  };

  const updateData = {
    workspaceId: input.workspaceId,
    provider: input.provider,
    accessToken: sealSecret(input.accessToken),
    refreshToken: sealSecret(input.refreshToken),
    tokenExpiresAt: input.tokenExpiresAt,
    status: SocialAccountStatus.ACTIVE,
    failureCount: 0,
    lastFailureAt: null,
    lastRefreshedAt: new Date(),
    providerId: input.providerId ?? null,
    username: input.username ?? null,
    refreshExpiresAt: input.refreshExpiresAt ?? null,
  };

  const account = await prisma.socialAccount.upsert({
    where: { shopId: input.shopId },
    create: createData,
    update: updateData,
  });

  return decryptAccount(account);
}

export async function getActiveSocialAccountByShopId(
  shopId: string,
  now = new Date(),
): Promise<DecryptedSocialAccount | null> {
  const account = await prisma.socialAccount.findFirst({
    where: {
      shopId,
      status: SocialAccountStatus.ACTIVE,
      tokenExpiresAt: { gt: now },
    },
  });

  return account ? decryptAccount(account) : null;
}

export async function getSocialAccountById(
  id: string,
): Promise<DecryptedSocialAccount | null> {
  const account = await prisma.socialAccount.findUnique({
    where: { id },
  });

  return account ? decryptAccount(account) : null;
}

export async function listAccountsDueForRefresh(
  refreshBefore: Date,
): Promise<SocialAccount[]> {
  return prisma.socialAccount.findMany({
    where: {
      status: SocialAccountStatus.ACTIVE,
      tokenExpiresAt: { lte: refreshBefore },
    },
    orderBy: { tokenExpiresAt: "asc" },
  });
}

export async function markSocialAccountRefreshSuccess(
  accountId: string,
  input: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    refreshExpiresAt?: Date;
  },
): Promise<void> {
  const data = {
    accessToken: sealSecret(input.accessToken),
    refreshToken: sealSecret(input.refreshToken),
    tokenExpiresAt: input.tokenExpiresAt,
    status: SocialAccountStatus.ACTIVE,
    failureCount: 0,
    lastFailureAt: null,
    lastRefreshedAt: new Date(),
    refreshExpiresAt: input.refreshExpiresAt ?? null,
  };

  await prisma.socialAccount.update({
    where: { id: accountId },
    data,
  });
}

export async function markSocialAccountRefreshFailure(
  accountId: string,
  currentFailureCount: number,
): Promise<void> {
  await prisma.socialAccount.update({
    where: { id: accountId },
    data: {
      failureCount: { increment: 1 },
      lastFailureAt: new Date(),
      status:
        currentFailureCount >= 2
          ? SocialAccountStatus.REFRESH_FAILED
          : SocialAccountStatus.ACTIVE,
    },
  });
}

export async function revokeSocialAccountByShopId(shopId: string): Promise<void> {
  await prisma.socialAccount.update({
    where: { shopId },
    data: {
      status: SocialAccountStatus.REVOKED,
      lastFailureAt: new Date(),
    },
  });
}

export async function upsertWebhookEvent(input: {
  socialAccountId: string;
  externalEventId: string;
  eventType: string;
  rawPayload: Prisma.InputJsonValue;
}): Promise<WebhookEventInbox> {
  return prisma.webhookEventInbox.upsert({
    where: { externalEventId: input.externalEventId },
    create: {
      socialAccountId: input.socialAccountId,
      externalEventId: input.externalEventId,
      eventType: input.eventType,
      rawPayload: input.rawPayload,
    },
    update: {},
  });
}

export async function listPendingWebhookEvents(limit = 100): Promise<WebhookEventInbox[]> {
  return prisma.webhookEventInbox.findMany({
    where: { status: InboxStatus.PENDING },
    orderBy: { receivedAt: "asc" },
    take: limit,
  });
}

export async function claimWebhookEventForProcessing(
  id: string,
): Promise<WebhookEventInbox | null> {
  const [claimed] = await prisma.$queryRawUnsafe<WebhookEventInbox[]>(
    `UPDATE "WebhookEventInbox"
     SET "status" = 'PROCESSING', "retryCount" = "retryCount" + 1
     WHERE "id" = $1::uuid AND "status" = 'PENDING'
     RETURNING *`,
    id,
  );
  return claimed ?? null;
}

export async function markWebhookEventDone(id: string): Promise<void> {
  await prisma.webhookEventInbox.update({
    where: { id },
    data: {
      status: InboxStatus.DONE,
      processedAt: new Date(),
      lastError: null,
    },
  });
}

export async function markWebhookEventDead(
  id: string,
  reason: string,
): Promise<void> {
  await prisma.webhookEventInbox.update({
    where: { id },
    data: {
      status: InboxStatus.DEAD,
      processedAt: new Date(),
      lastError: reason,
    },
  });
}
