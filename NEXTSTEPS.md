# Next Steps - TikTok Shop API Integration

## Current Status

- ✅ Prisma downgraded to v6.19.2 (resolved deployment issues)
- ✅ API deployed successfully on Railway
- ✅ TikTok Postman Collection reviewed and analyzed
- ⚠️ Shop API integration 5% complete (only OAuth token exchange)

## Phase 1: Webhook Infrastructure (High Priority)

**Goal**: Enable real-time shop events

### Tasks

- [ ] Implement webhook event handlers in `packages/api/src/webhooks/`
  - [ ] Order created/updated webhook
  - [ ] Product status webhook
  - [ ] Return/refund webhook
- [ ] Validate incoming webhook signatures (TikTok Shop requirement)
- [ ] Process `WebhookEventInbox` table entries (currently just stored)
- [ ] Setup error handling and retry logic for failed webhook processing
- [ ] Add webhook testing in Postman collection integration tests

**Endpoint Reference**: `/shop/webhooks/` (update webhook subscriptions)
**DB Tables**: `WebhookEventInbox`, `SocialAccount`

---

## Phase 2: Orders Sync API (Medium Priority)

**Goal**: Automatically sync orders from TikTok Shop to dashboard

### Tasks

- [ ] Create `packages/api/src/orders/` module
  - [ ] Implement `fetchOrderList()` - GET orders by shop/date
  - [ ] Implement `fetchOrderDetails()` - Get full order data
  - [ ] Implement `cancelOrder()` - Handle order cancellations
- [ ] Setup scheduled sync job (every 30 min or webhook-driven)
- [ ] Enrich `OrderSyncLog` with order items, buyer info, shipping status
- [ ] Create dashboard view for order analytics
- [ ] Add error handling for token expiration (refresh token logic)

**Endpoint Reference**:

- `GET /shop/orders/list` (fetch orders)
- `GET /shop/orders/{id}` (order details)
- `POST /shop/orders/{id}/cancel` (cancel)

**DB Tables**: `OrderSyncLog`, `SocialAccount`

---

## Phase 3: Products & Campaign Linking (Medium Priority)

**Goal**: Connect products to campaigns for performance tracking

### Tasks

- [ ] Add `productId` linking to `Campaign` model (already exists)
- [ ] Create `packages/api/src/products/` module
  - [ ] Implement `getProductDetails()` - Product info/inventory
  - [ ] Implement `updateInventory()` - Stock management
  - [ ] Implement `getProductAnalytics()` - Sales per product
- [ ] Dashboard feature: Show which campaign drove product sales
- [ ] Create product selector UI in campaign creation
- [ ] Add analytics: "Campaign X sold N units of Product Y"

**Endpoint Reference**:

- `GET /shop/products/{id}` (product details)
- `GET /shop/products/analytics` (sales data)
- `PUT /shop/products/{id}/inventory` (stock update)

**DB Tables**: `Campaign`, `OrderSyncLog`

---

## Phase 4: Creator Affiliate Program (Lower Priority)

**Goal**: Automate creator collaboration tracking and commission management

### Tasks

- [ ] Extend `CreatorStats` with affiliate-specific metrics
- [ ] Create `packages/api/src/affiliate/` module
  - [ ] Implement `getCreatorPerformance()` - Earnings, commissions
  - [ ] Implement `getOpenCollaborations()` - Available programs
  - [ ] Implement `createTargetCollaboration()` - Invite creator
- [ ] Dashboard: Creator marketplace + collab suggestions
- [ ] Add tier system (gold/silver/bronze affiliate levels)
- [ ] Automated commission payouts workflow

**Endpoint Reference**:

- `GET /affiliate/creator/orders` (creator earnings)
- `GET /affiliate/seller/collaborations` (open programs)
- `POST /affiliate/seller/collaborations` (create collab)

**DB Tables**: `CreatorStats`, `SocialAccount`

---

## Phase 5: Returns & Compliance (Lower Priority)

**Goal**: Automated returns handling and compliance alerts

### Tasks

- [ ] Implement `packages/api/src/aftersale/` module
  - [ ] Fetch pending returns/refunds
  - [ ] Auto-process low-value returns
  - [ ] Track return metrics per creator
- [ ] Expand `ComplianceAlert` system
  - [ ] Track deauthorizations, shadowbans
  - [ ] Implement alert notifications
  - [ ] Dashboard compliance health view

**Endpoint Reference**:

- `GET /shop/returns` (fetch returns)
- `POST /shop/returns/{id}/confirm` (process return)
- `GET /compliance/alerts` (get alerts)

**DB Tables**: `ComplianceAlert`, `SocialAccount`

---

## Technical Debt & Refactoring

- [ ] Extract TikTok Shop client into `@neomello/tiktok-shop-sdk` (alongside tiktok-sdk)
- [ ] Add comprehensive error handling for all Shop API errors
- [ ] Implement token refresh automation (refresh before expiry)
- [ ] Add rate limiting to avoid TikTok Shop API quotas
- [ ] Unit tests for all new API modules
- [ ] Integration tests using Postman collection

---

## Environment & Configuration

**Important**: Shop API uses different base URL than Content API

- Content API: `https://open.tiktokapis.com/v2`
- Shop API: `https://open-api.tiktokglobalshop.com`
- Auth: `https://auth.tiktok-shops.com/api/v2/token`

**Required environment variables** (already in Railway):

- `TIKTOK_SHOP_APP_KEY` - Shop app OAuth key
- `TIKTOK_SHOP_APP_SECRET` - Shop app OAuth secret
- `DATABASE_URL` - Postgres connection
- `DB_CONNECT_TIMEOUT_MS` - API startup timeout for fail-fast database boot
- `TIKTOK_WEBHOOK_SECRET` - For webhook signature validation
- `TIKTOK_WEBHOOK_SIGNATURE_HEADER` - Header name used for signature validation
- `TIKTOK_WEBHOOK_TIMESTAMP_HEADER` - Header name used for replay protection

---

## Decision Points

1. **Sync frequency**: Real-time (webhooks) vs scheduled (every 30 min)?
   - Recommendation: Hybrid - webhooks for critical (orders), scheduled for analytics
2. **MVP scope**: Start with Orders → Products → Webhooks?
   - Current recommendation: Webhooks first (foundation), then Orders
3. **Analytics**: Store raw data in DB or aggregate in dashboard?
   - Recommendation: Store raw, compute aggregates on-demand (simpler)

---

## Postman Collection Integration

- Collection: `/docs/TikTokShopPostmanCollection/API 2.0.postman_collection.json`
- Environment: `/docs/TikTokShopPostmanCollection/Test Environment.postman_environment.json`
- Use for: Testing, documentation, endpoint reference
- Next: Integrate as automated API tests in CI/CD

---

**Last Updated**: 2026-03-19
**Updated By**: Codex
