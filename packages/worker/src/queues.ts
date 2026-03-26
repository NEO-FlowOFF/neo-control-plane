import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

export const refreshTokensQueueName = "refresh-tiktok-tokens";
export const webhookProjectorQueueName = "project-tiktok-webhooks";
export const inventoryPublisherQueueName = "publish-tiktok-inventory";

export const refreshTokensQueue = new Queue(refreshTokensQueueName, {
  connection: redisConnection as any,
});

export const webhookProjectorQueue = new Queue(webhookProjectorQueueName, {
  connection: redisConnection as any,
});

export const inventoryPublisherQueue = new Queue(inventoryPublisherQueueName, {
  connection: redisConnection as any,
});

export const platformAnnouncementsQueueName = "monitor-platform-announcements";
export const platformAnnouncementsQueue = new Queue(platformAnnouncementsQueueName, {
  connection: redisConnection as any,
});
