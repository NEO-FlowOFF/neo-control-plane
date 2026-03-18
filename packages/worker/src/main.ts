import "dotenv/config";
import { Worker } from "bullmq";
import { redisConnection, redisWorkerConnection } from "./connection.js";
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
  connection: redisWorkerConnection,
  concurrency: 5,
});

const webhookWorker = new Worker(webhookProjectorQueueName, handleWebhookProjectorJob, {
  connection: redisWorkerConnection,
  concurrency: 10,
});

const inventoryWorker = new Worker(
  inventoryPublisherQueueName,
  handleInventoryPublisherJob,
  {
    connection: redisWorkerConnection,
    concurrency: 20,
  },
);

const announcementWorker = new Worker(
  platformAnnouncementsQueueName,
  handlePlatformAnnouncementsJob,
  {
    connection: redisWorkerConnection,
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

async function gracefulShutdown(signal: string) {
  console.log("worker_shutdown", { signal });
  await Promise.all([
    refreshWorker.close(),
    webhookWorker.close(),
    inventoryWorker.close(),
    announcementWorker.close(),
  ]);
  await Promise.all([
    refreshTokensQueue.close(),
    webhookProjectorQueue.close(),
    inventoryPublisherQueue.close(),
    platformAnnouncementsQueue.close(),
  ]);
  await Promise.all([redisConnection.quit(), redisWorkerConnection.quit()]);
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
