# Swar Yoga Web App & CRM - AI Instructions

This document provides essential context and coding standards for AI agents working on the Swar Yoga codebase.

## 🏗 Architecture & Data Flow
- **Framework**: Next.js 14 (App Router) with TypeScript and Tailwind CSS.
- **Database**: MongoDB (Atlas). Use `lib/db.ts` for connection and `lib/schemas/enterpriseSchemas.ts` for CRM/messaging models.
- **WhatsApp Integration**:
  - **Meta API (Primary)**: Handled via `app/api/whatsapp/webhook/route.ts`. Preferred for production.
  - **Meta Inbound Ingestion**: Raw webhook payloads are logged in `whatsapp_webhook_events` (CRM DB) via `logWebhookEvent()`.
- **Database Routing**: The app uses two logical databases on the same cluster:
  - `swaryogaDB`: Primary website, user profiles, and Life Planner data.
  - `swaryoga_admin_crm`: CRM leads, WhatsApp logs, and audit data.

## 🛠 Critical Developer Workflows
- **Environment**: Use `.env.local`. Required keys: `MONGODB_URI_MAIN`, `MONGODB_CRM_DB_NAME`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`.
- **Diagnostics Scripts**:
  - `node scripts/smoke-prod.js`: Quick environment health check.
  - `node scripts/check-webhook-events.js`: Verify incoming Meta webhook hits.
  - `node scripts/mongo-main-db-report.js`: Database integrity report.
- **Initialization**: Always `await connectDB()` at the top of API handlers before accessing models.

## 📏 Coding Conventions & Patterns
- **Database Models**: 
  - ALWAYS use getter functions (e.g., `getLead()`, `getWhatsAppMessage()`) from `@/lib/schemas/enterpriseSchemas`.
  - Avoid legacy Proxy exports (e.g., `const { Lead } = ...`) in new modules.
- **API Security**: CRM routes must verify admin status using `verifyToken` and `decoded.isAdmin`. Use `getViewerUserId(decoded)` and `isSuperAdmin(decoded)` from `@/lib/crm-handlers` for multi-user filters.
- **Standardized Responses**: Use `apiError` and `apiSuccess` from `@/lib/api-error.ts`.
- **Phone Normalization**: Use `normalizePhone` from `@/lib/whatsapp` (removes non-digits, prefixes '91' for 10-digit IN numbers).
- **CRM Frontend**: Use unified hooks (`useAuth`, `useCRM`, `useSearch`, `useModal`) and components from `@/components/admin/crm/`.

## 🔌 Integration Points
- **Payments**: Unified logic in `app/api/payments/` for PayU (India) and Cashfree.
- **Panchang**: Native server-side calculations in `lib/calendarCalculations.ts`.

## ⚠️ Known Issues / Warnings
- **Database Initialization**: Models accessed before `connectDB()` will fail; dynamic imports or getters are used to satisfy this.
- **Meta Verification**: The Hub Verify Token is configured via `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- **Deprecated Bridge**: Ignore `deploy/wa-bridge/` for new WhatsApp features.
