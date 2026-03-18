import { Redis } from "ioredis";
import { config } from "./config.js";

function createRedisConnection(): Redis {
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// BullMQ requires separate connections for Queue and Worker instances.
// Sharing a single connection causes unpredictable behavior.
export const redisConnection = createRedisConnection();
export const redisWorkerConnection = createRedisConnection();
