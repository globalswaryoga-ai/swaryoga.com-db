# Swar Yoga Web App & CRM - AI Instructions

This document provides essential context and coding standards for AI agents working on the Swar Yoga codebase.

## 🏗 Architecture & Data Flow
- **Framework**: Next.js 14 (App Router) with TypeScript and Tailwind CSS.
- **Database**: MongoDB (Atlas). Use `lib/db.ts` for connection and `lib/schemas/enterpriseSchemas.ts` for CRM/messaging models.
- **WhatsApp Integration**:
  - **Meta API (Primary)**: Handled via `app/api/whatsapp/webhook/route.ts`. Preferred for production.
  - **EC2 Bridge (Deprecated)**: Uses `whatsapp-web.js` on a separate server. Marked for removal.
- **Database Routing**: The app uses two logical databases on the same cluster:
  - `swaryogaDB`: Primary website, user profiles, and Life Planner data.
  - `swaryoga_admin_crm`: CRM leads, WhatsApp logs, and audit data.

## 🛠 Critical Developer Workflows
- **Environment**: Use `.env.local` for all configuration. Required keys: `MONGODB_URI_MAIN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- **Diagnostics**:
  - Use `node scripts/check-webhook-events.js` to monitor Meta hits.
  - Check the `whatsapp_webhook_events` collection in the CRM database for raw ingestion logs.
  - Use `node scripts/smoke-prod.js` for quick health checks.

## 📏 Coding Conventions & Patterns
- **Database Models**: ALWAYS use the getter functions from `@/lib/schemas/enterpriseSchemas` (e.g., `getLead()`, `getWhatsAppMessage()`). Do not use the legacy Proxy exports for new code.
- **Phone Normalization**: Always use `normalizePhone` from `@/lib/whatsapp` (removes non-digits).
- **Errors**: Use `lib/error-handler.ts` or `lib/api-error.ts` for consistent API responses.
- **Components**: Reusable UI components are in `/components/admin/crm` for the dashboard and `/components/` for the main site.

## 🔌 Integration Points
- **Payments**: PayU (India), Cashfree, and Manual (Nepal). Logic in `app/api/payments/`.
- **WhatsApp**: Webhook handles `inbound_message` and `status_update` (sent, delivered, read, failed).
- **Panchang**: Native calculations in `lib/calendarCalculations.ts` (replaced native module for Vercel compat).

## ⚠️ Known Issues / Warnings
- **Duplicate Messages**: Running BOTH Meta API and EC2 Bridge will cause duplicate messages in the CRM.
- **Webhook Debugging**: Log points in `logWebhookEvent()` write to `whatsapp_webhook_events`. Always check there first if messages "aren't arriving".
- **Timestamps**: Ensure `createdAt` and `updatedAt` are manually included if using raw MongoDB `updateOne` or `upsert`.
