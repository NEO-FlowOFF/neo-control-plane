export { prisma } from "./client.js";
export { openSecret, sealSecret } from "./crypto.js";
export {
  getActiveSocialAccountByShopId,
  getSocialAccountById,
  listAccountsDueForRefresh,
  listPendingWebhookEvents,
  markSocialAccountRefreshFailure,
  markSocialAccountRefreshSuccess,
  markWebhookEventDead,
  markWebhookEventDone,
  claimWebhookEventForProcessing,
  revokeSocialAccountByShopId,
  upsertSocialAccountTokens,
  upsertWebhookEvent,
  type DecryptedSocialAccount,
  type UpsertSocialAccountTokensInput,
} from "./social-accounts.js";
