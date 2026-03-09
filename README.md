# Swar Yoga — Web App & CRM

Full-stack Next.js 14 application for **Swar Yoga** — combining a public-facing website with an admin CRM, WhatsApp messaging inbox, payment processing, and AI-powered chatbot flows.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | MongoDB Atlas |
| WhatsApp | Meta Cloud API + Baileys QR Bridge |
| Payments | PayU (India) + Cashfree |
| Hosting | Vercel (web) + AWS EC2 (bridge) |

## Project Structure

```
app/                  # Next.js App Router pages & API routes
  admin/crm/          # CRM admin dashboard pages
  api/                # REST API endpoints
components/           # Reusable React components
  admin/crm/          # CRM-specific components
lib/                  # Shared utilities, DB schemas, helpers
  schemas/            # Mongoose model definitions
  crm/                # CRM business logic
deploy/               # Deployment configs (EC2 bridge, etc.)
scripts/              # Diagnostic & maintenance scripts
docs/archive/         # Historical work logs & documentation
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in: MONGODB_URI_MAIN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, etc.

# 3. Run development server
npm run dev
```

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI_MAIN` | MongoDB Atlas connection string |
| `MONGODB_CRM_DB_NAME` | CRM database name |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | Meta API access token |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook verification token |

## Diagnostic Scripts

```bash
node scripts/smoke-prod.js           # Environment health check
node scripts/check-webhook-events.js # Verify Meta webhook hits
node scripts/mongo-main-db-report.js # Database integrity report
```

## CRM Architecture

The CRM uses two logical databases on the same MongoDB cluster:
- **swaryogaDB** — User profiles, Life Planner, website data
- **swaryoga_admin_crm** — Leads, WhatsApp logs, chatbot flows, audit data

### Important Patterns
- Always call `await connectDB()` before accessing models
- Use getter functions (`getLead()`, `getWhatsAppMessage()`) from `@/lib/schemas/enterpriseSchemas`
- Use `apiError()` / `apiSuccess()` from `@/lib/api-error` for standardized responses
- Use `logger` from `@/lib/logger` for structured logging
- Use `normalizePhone()` from `@/lib/whatsapp` for phone number formatting
