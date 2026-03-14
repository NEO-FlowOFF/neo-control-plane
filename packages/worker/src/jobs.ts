import type { Job } from "bullmq";
import {
  getSocialAccountById,
  listAccountsDueForRefresh,
  listPendingWebhookEvents,
  markSocialAccountRefreshFailure,
  markSocialAccountRefreshSuccess,
  claimWebhookEventForProcessing,
  markWebhookEventDead,
  markWebhookEventDone,
  revokeSocialAccountByShopId,
} from "@neomello/db";
import {
  fetchPlatformAnnouncements,
  filterTikTokAnnouncements
} from "./announcements.js";
import { config } from "./config.js";
import {
  inventoryPublisherQueue,
  refreshTokensQueue,
  webhookProjectorQueue,
} from "./queues.js";
import { refreshOAuthTokens, pushInventoryUpdate } from "./tiktok-shop.js";

type RefreshTokenJobData = {
  socialAccountId: string;
};

type WebhookProjectorJobData = {
  webhookEventId: string;
};

type InventoryPublisherJobData = {
  socialAccountId: string;
  skuId: string;
  quantity: number;
  warehouseId?: string;
};

type WebhookPayload = {
  type?: string;
  shop_id?: string;
  data?: {
    sku_list?: Array<{
      sku_id?: string;
      quantity?: number;
      warehouse_id?: string;
    }>;
  };
};

export async function handleRefreshTokenJob(
  job: Job<RefreshTokenJobData>,
): Promise<void> {
  if (job.name === "scan-refreshable-accounts") {
    await enqueueDueRefreshJobs();
    return;
  }

  const account = await getSocialAccountById(job.data.socialAccountId);

  if (!account || account.status !== "ACTIVE") {
    return;
  }

  const refreshed = await refreshOAuthTokens({
    tokenUrl: config.TIKTOK_SHOP_TOKEN_URL,
    appKey: config.TIKTOK_SHOP_APP_KEY,
    appSecret: config.TIKTOK_SHOP_APP_SECRET,
    refreshToken: account.refreshToken,
  }).catch(async (error: unknown) => {
    await markSocialAccountRefreshFailure(account.id, account.failureCount);
    throw error;
  });

  await markSocialAccountRefreshSuccess(account.id, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    ...(refreshed.refresh_expires_in
      ? {
        refreshExpiresAt: new Date(
          Date.now() + refreshed.refresh_expires_in * 1000,
        ),
      }
      : {}),
  });
}

export async function handleWebhookProjectorJob(
  job: Job<WebhookProjectorJobData>,
): Promise<void> {
  if (job.name === "scan-pending-webhooks") {
    await enqueuePendingWebhookEvents();
    return;
  }

  // Atomic claim: SELECT + UPDATE in one query, prevents race conditions
  const event = await claimWebhookEventForProcessing(job.data.webhookEventId);

  if (!event) {
    // Already claimed by another worker or no longer PENDING
    return;
  }

  const account = await getSocialAccountById(event.socialAccountId);

  if (!account || account.status !== "ACTIVE" || account.tokenExpiresAt <= new Date()) {
    await markWebhookEventDead(event.id, "ACCOUNT_NOT_ACTIVE");
    return;
  }

  const webhookPayload = event.rawPayload as WebhookPayload;

  if (webhookPayload.type === config.TIKTOK_SHOP_AUTH_REVOKED_EVENT && webhookPayload.shop_id) {
    await revokeSocialAccountByShopId(webhookPayload.shop_id);
    await markWebhookEventDone(event.id);
    return;
  }

  const skuList = webhookPayload.data?.sku_list ?? [];

  for (const sku of skuList) {
    if (!sku.sku_id || typeof sku.quantity !== "number") {
      continue;
    }

    const jobData: InventoryPublisherJobData = {
      socialAccountId: account.id,
      skuId: sku.sku_id,
      quantity: sku.quantity,
      ...(sku.warehouse_id ? { warehouseId: sku.warehouse_id } : {}),
    };

    await inventoryPublisherQueue.add("publish", jobData, {
      jobId: `${event.id}:${sku.sku_id}`,
      removeOnComplete: true,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
  }

  await markWebhookEventDone(event.id);
}

export async function handleInventoryPublisherJob(
  job: Job<InventoryPublisherJobData>,
): Promise<void> {
  const account = await getSocialAccountById(job.data.socialAccountId);

  if (!account || account.status !== "ACTIVE" || account.tokenExpiresAt <= new Date()) {
    throw new Error("SocialAccount is not active.");
  }

  const input = {
    apiBaseUrl: config.TIKTOK_SHOP_API_BASE_URL,
    path: config.TIKTOK_SHOP_INVENTORY_UPDATE_PATH,
    accessToken: account.accessToken,
    skuId: job.data.skuId,
    quantity: job.data.quantity,
    ...(job.data.warehouseId ? { warehouseId: job.data.warehouseId } : {}),
  };

  await pushInventoryUpdate(input);
}

export async function enqueueDueRefreshJobs(): Promise<void> {
  const refreshBefore = new Date(Date.now() + 10 * 60 * 1000);
  const dueAccounts = await listAccountsDueForRefresh(refreshBefore);

  for (const account of dueAccounts) {
    await refreshTokensQueue.add(
      "refresh",
      { socialAccountId: account.id },
      {
        jobId: account.id,
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );
  }
}

export async function enqueuePendingWebhookEvents(): Promise<void> {
  const pendingEvents = await listPendingWebhookEvents(200);

  for (const event of pendingEvents) {
    await webhookProjectorQueue.add(
      "project",
      { webhookEventId: event.id },
      {
        jobId: event.id,
        removeOnComplete: true,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );
  }
}

export async function handlePlatformAnnouncementsJob(): Promise<void> {
  const all = await fetchPlatformAnnouncements();
  const tiktokOnly = filterTikTokAnnouncements(all);

  if (tiktokOnly.length > 0 && tiktokOnly[0]) {
    console.log("TIKTOK_PLATFORM_ANNOUNCEMENTS_DETECTED", {
      count: tiktokOnly.length,
      latest: tiktokOnly[0].title,
      link: tiktokOnly[0].link
    });
  }
}
