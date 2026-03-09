import { Worker } from "bullmq";
import { redisConnection } from "./connection.js";
import {
  inventoryPublisherQueue,
  inventoryPublisherQueueName,
  refreshTokensQueue,
  refreshTokensQueueName,
  webhookProjectorQueue,
  webhookProjectorQueueName,
} from "./queues.js";
import {
  handleInventoryPublisherJob,
  handleRefreshTokenJob,
  handleWebhookProjectorJob,
  handlePlatformAnnouncementsJob,
} from "./jobs.js";
import {
  platformAnnouncementsQueue,
  platformAnnouncementsQueueName
} from "./queues.js";

await refreshTokensQueue.upsertJobScheduler(
  "scan-refreshable-accounts",
  { every: 5 * 60 * 1000 },
  {
    name: "scan-refreshable-accounts",
    opts: {
      removeOnComplete: true,
    },
  },
);

await webhookProjectorQueue.upsertJobScheduler(
  "scan-pending-webhooks",
  { every: 60 * 1000 },
  {
    name: "scan-pending-webhooks",
    opts: {
      removeOnComplete: true,
    },
  },
);

await platformAnnouncementsQueue.upsertJobScheduler(
  "scan-platform-announcements",
  { every: 60 * 60 * 1000 }, // Uma vez por hora
  {
    name: "scan-platform-announcements",
    opts: {
      removeOnComplete: true,
    },
  },
);

const refreshWorker = new Worker(refreshTokensQueueName, handleRefreshTokenJob, {
  connection: redisConnection,
  concurrency: 5,
});

const webhookWorker = new Worker(webhookProjectorQueueName, handleWebhookProjectorJob, {
  connection: redisConnection,
  concurrency: 10,
});

const inventoryWorker = new Worker(
  inventoryPublisherQueueName,
  handleInventoryPublisherJob,
  {
    connection: redisConnection,
    concurrency: 20,
  },
);

const announcementWorker = new Worker(
  platformAnnouncementsQueueName,
  handlePlatformAnnouncementsJob,
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

for (const worker of [refreshWorker, webhookWorker, inventoryWorker, announcementWorker]) {
  worker.on("failed", (job, error) => {
    console.error("worker_job_failed", {
      queue: worker.name,
      jobId: job?.id,
      error: error.message,
    });
  });
}

process.on("SIGTERM", async () => {
  await Promise.all([
    refreshWorker.close(),
    webhookWorker.close(),
    inventoryWorker.close(),
    announcementWorker.close(),
    refreshTokensQueue.close(),
    webhookProjectorQueue.close(),
    inventoryPublisherQueue.close(),
    platformAnnouncementsQueue.close(),
    redisConnection.quit(),
  ]);
  process.exit(0);
});
