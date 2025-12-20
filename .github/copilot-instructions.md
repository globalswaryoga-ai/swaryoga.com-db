# Swar Yoga Web — Copilot Instructions
# Swar Yoga Web — Copilot Instructions

## Repo shape
- Next.js 14 **App Router**: UI in `app/**`; API routes in `app/api/**/route.ts` (imports commonly use the `@/` alias).
- Data layer: MongoDB via Mongoose. `connectDB()` + **all models live in `lib/db.ts`**. Add new schemas/exports there using `mongoose.models.X || mongoose.model('X', schema)`.
- Legacy artifacts exist (`server.js`, `api/` folder). Prefer `app/` + `app/api/` unless the task explicitly targets legacy.

## Commands
- Dev: `npm run dev`
- Build: `npm run build` (TS/ESLint issues may not fail build due to `next.config.js`; verify with `npm run type-check` + `npm run lint`)
- Self-hosting helpers: `npm run pm2:*` (see `ecosystem.config.js`)

## API/auth/DB patterns to copy
- Auth: `Authorization: Bearer <token>` → `verifyToken()` from `lib/auth.ts`; require `decoded.userId` or return 401 (example: `app/api/notes/route.ts`).
- DB: `await connectDB()` early; prefer `.lean()` for read endpoints.
- IDs: validate Mongo IDs with `Types.ObjectId.isValid(id)` (example: `app/api/notes/[id]/route.ts`).
- Responses: `NextResponse.json({ success: true, data })` and `NextResponse.json({ error }, { status })`.

## Payments (PayU) — actual flow here
- Client: `app/checkout/page.tsx` calls `POST /api/payments/payu/initiate`, then submits a hidden HTML form to PayU `/_payment`.
- Initiate: `app/api/payments/payu/initiate/route.ts`
  - Adds a 3.3% platform fee server-side; sanitizes PayU fields (notably strips `|`).
  - Anti-throttle is **two-layer**: in-memory limiter (`lib/rateLimit.ts`, per userId+IP, 1 per 60s) + DB cooldown (recent pending `Order`) → 429 + `Retry-After`.
  - PayU-safe `txnid` is stored as `Order.payuTxnId` (alphanumeric, <= 25 chars).
  - Nepal flow bypasses PayU: creates `Order` with `paymentMethod: 'nepal_qr'` + `paymentStatus: 'pending_manual'`.
- Hashing: `lib/payments/payu.ts` (SHA512; field order + udf placeholders are strict). Enable verbose logs with `DEBUG_PAYU=1`.
- Callback: `app/api/payments/payu/callback/route.ts` reads `request.formData()`, verifies hash, updates `Order`.
  - Seat decrement is idempotent via `Order.seatInventoryAdjusted`; uses `WorkshopSeatInventory` upsert/decrement and may derive `seatsTotal` from `WorkshopSchedule`.
  - Order lookup prefers `Order.findOne({ payuTxnId })`, falls back to `findById(txnid)` for older flows.
- Webhooks: `app/api/webhooks/payu/{successful,failed,refund}/route.ts`.

## Env + debugging
- Required: `MONGODB_URI`, `JWT_SECRET`. PayU: `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_MODE`.
- Redirect base URL: `lib/requestBaseUrl.ts` prefers real request host in prod (ignores localhost env when the request isn’t local).
- Debug endpoints: `GET /api/debug/env-check`, `GET /api/debug/connection`.
- Useful scripts: `node test-mongodb.js`, `node test-payu-integration.js`, `node diagnose-payu-403.js`, `DEBUG_PAYU=1 node debug-payu-advanced.js`.

## Non-obvious config
- `next.config.js` reads optional `.env.payment` at config-eval time to set `NEXT_PUBLIC_PAYMENT_OVERRIDES` → restart dev server/rebuild to apply.
