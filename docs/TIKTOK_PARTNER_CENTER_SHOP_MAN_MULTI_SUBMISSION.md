# TikTok Partner Center Submission

## Requirement

`SHOP-MAN-MULTI`

## Submission Draft

Our application satisfies the `SHOP-MAN-MULTI` requirement by supporting connected shop management and autonomous token lifecycle maintenance for TikTok Shop accounts.

Implemented capabilities:

- OAuth authorization and callback flow for TikTok Shop connection
- Persistent storage of access token, refresh token, access token expiry, and refresh token expiry
- Background worker with scheduled scan of refreshable accounts every 5 minutes
- Automatic token refresh before expiry using the TikTok Shop token refresh API
- Persistence of refreshed token state, including `tokenExpiresAt`, `updatedAt`, and `lastRefreshedAt`
- Operational endpoints for subscription management, webhook health, replay, mute/reactivate controls, and audit visibility

Production evidence:

- The worker successfully scanned due accounts, enqueued refresh jobs, executed token refresh, and persisted new expiry timestamps without manual intervention
- The operational API surface is live in production under `/ops/tiktok-shop/*` and responds successfully

## Internal Evidence Map

- API OAuth and callback: `neo-content-accounts-api/packages/api/src/server.ts`
- Ops operational surface: `neo-content-accounts-api/packages/api/src/routes/ops.ts`
- Refresh scheduler and worker flow: `neo-content-accounts-api/packages/worker/src/main.ts`
- Refresh queue execution: `neo-content-accounts-api/packages/worker/src/jobs.ts`
- Token persistence: `neo-content-accounts-api/packages/db/src/social-accounts.ts`
- Production worker logs: `neo-content-accounts-api/logs/logs.1775061963283.json`
- Production runtime logs: `neo-content-accounts-api/logs/logs.1775061998281.json`
