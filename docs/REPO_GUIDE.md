# Swar Yoga Repo Guide

This repo is a large Next.js 14 App Router project. Treat it as several products living in one codebase:

- Public Swar Yoga website
- Workshop registration and payments
- E-learning and recordings
- Community and sadhana areas
- Life Planner
- Admin dashboard
- Admin CRM with WhatsApp, leads, sales, media, KP astrology, reports, and automation
- Support scripts for diagnostics, imports, bridge operations, and production maintenance

## Tech Stack

- Framework: Next.js 14 App Router
- Language: TypeScript and JavaScript
- Styling: Tailwind CSS
- Database: MongoDB Atlas through Mongoose and MongoDB clients
- Payments: PayU and Cashfree
- Messaging: Meta WhatsApp Cloud API plus QR/Baileys bridge code
- Hosting/deploy: Vercel for web, EC2/PM2 style bridge deployment files

## Main Folders

| Path | What lives here |
| --- | --- |
| `app/` | Pages, layouts, and API routes |
| `app/api/` | Next.js API route handlers |
| `components/` | Shared React components |
| `components/admin/crm/` | CRM shell, sidebar, CRM UI, KP astrology widgets |
| `lib/` | Shared business logic, database access, schemas, API helpers |
| `lib/schemas/` | Main Mongoose schema files |
| `lib/crm/` | CRM-specific helpers and business logic |
| `lib/kpAstro/` | KP astrology calculation, prompts, exports, references |
| `lib/tally/` | Tally/accounting integration logic |
| `lib/backup/` | Backup/export/restore services |
| `hooks/` | Shared React hooks |
| `public/` | Static assets |
| `scripts/` | Maintenance, audit, import, diagnostic, and repair scripts |
| `deploy/` | Bridge/server deployment files |
| `docs/` | Documentation and archived notes |
| `user-api/` | Separate Express/TypeScript user API package |

## Page Families

The app has hundreds of pages. These are the important groups to learn first:

| Route area | Purpose |
| --- | --- |
| `/` | Main public homepage |
| `/about`, `/contact`, `/faq`, `/privacy`, `/terms` | Public information pages |
| `/workshops`, `/workshops/[slug]`, `/workshop/...` | Workshop discovery, dates, registration, older workshop routes |
| `/registration/[mode]/[language]/[workshop]` | Workshop registration flow |
| `/checkout`, `/cart`, `/payment-*`, `/pay-nepal` | Checkout and payment result pages |
| `/e-learning`, `/e-learning/[slug]` | Recorded course and learning flow |
| `/community`, `/community/[communityId]`, `/my/communities` | Community feed, recordings, membership areas |
| `/sadhana/...` | Sadhana live/community/video experiences |
| `/life-planner/...` | User planner dashboard, tasks, goals, routines, ritucharya, accounting |
| `/admin` | Legacy/general admin dashboard |
| `/admin/crm` | Main CRM application |
| `/admin/crm/leads` | Lead management |
| `/admin/crm/whatsapp`, `/admin/crm/qr`, `/admin/crm/meta` | WhatsApp, QR bridge, and Meta messaging tools |
| `/admin/crm/sales` | Sales, certificates, uploads, accounting-adjacent workflows |
| `/admin/crm/kp-astro` | KP astrology tools and AI prediction workspace |
| `/admin/crm/e-learning` | Course management admin |
| `/admin/crm/community` | Community moderation/management |
| `/admin/crm/sadhana-*` | Sadhana program scheduling and announcements |
| `/crm-site` | CRM product/tenant-facing website and signup |

Current page count by group, from a local scan:

- `admin/crm`: 202 pages
- `life-planner`: 38 pages
- `community`: 21 pages
- `crm-site`: 12 pages
- `workshop`: 11 pages
- `workshops`: 5 pages
- `sadhana`: 5 pages
- `e-learning`: 5 pages

## API Families

Most backend behavior is under `app/api`. Biggest route families:

| API area | Purpose |
| --- | --- |
| `/api/admin/crm/*` | CRM backend: leads, WhatsApp, QR, broadcasts, reports, sales, tenants, email, KP astrology |
| `/api/crm-site/*` | CRM product/tenant signup, billing, modules, onboarding |
| `/api/community/*` | Community posts, recordings, membership, videos |
| `/api/workshops/*` | Workshops, registrations, schedules, availability |
| `/api/payments/*` | Cashfree and PayU payment flows |
| `/api/auth/*` | Login/signup/profile auth |
| `/api/life-planner/*` | Life Planner data and uploads |
| `/api/admin/e-learning/*` | Admin e-learning/course management |
| `/api/tally/*` | Tally/accounting endpoints |
| `/api/whatsapp/*` and `/api/webhooks/*` | WhatsApp and Meta webhook entrypoints |
| `/api/cron/*` | Scheduled processors |
| `/api/backup/*` | Backup/export/restore |

Current API count by group, from a local scan:

- `admin/crm`: 319 routes
- `crm-site`: 41 routes
- `community`: 34 routes
- `tally`: 17 routes
- `admin/workshops`: 16 routes
- `admin/e-learning`: 14 routes
- `user`: 12 routes
- `admin/community`: 12 routes
- `admin/social-media`: 10 routes

## Important Layouts

- `app/layout.tsx`: root app layout
- `app/admin/layout.tsx`: admin layout
- `app/admin/crm/layout.tsx`: CRM layout
- `app/life-planner/dashboard/layout.tsx`: Life Planner dashboard layout
- `app/community/layout.tsx`: Community layout
- `app/crm-site/layout.tsx`: CRM-site layout

## Important CRM Files

- `components/admin/crm/CrmShell.tsx`: likely main CRM frame
- `components/admin/crm/CrmSidebar.tsx`: CRM navigation sidebar
- `components/admin/crm/crmNavConfig.ts`: CRM navigation configuration
- `components/admin/crm/PageGuide.tsx`: page guidance UI
- `components/admin/crm/pageGuideData.ts`: CRM guide data
- `components/admin/crm/ui/`: CRM UI primitives
- `lib/schemas/enterpriseSchemas.ts`: central CRM schemas
- `lib/auth.ts` and `lib/adminAuth.ts`: auth helpers
- `lib/db.ts` and `lib/mongodb.ts`: database connection helpers
- `lib/logger.ts`: logging
- `lib/api-error.ts`: standardized API responses, when used
- `lib/whatsapp.ts`: WhatsApp helpers

## How To Run

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run type-check
npm test
npm run build
```

The `build` script runs cleanup before `next build`, so do not use it casually if you only want a fast syntax check.

## Current Local Notes

At the time this guide was created, the working tree already had:

- Modified: `.claude/settings.json`
- Untracked: `sales_import_apr_jun_2026.xlsx`

Do not remove or commit those until you know what they are for.

## Suggested Learning Order

1. Learn routing: inspect `app/page.tsx`, then public pages, then one feature group at a time.
2. Learn shared structure: `app/layout.tsx`, `middleware.ts`, `components/Navigation.tsx`, `components/Footer.tsx`.
3. Learn CRM shell: `app/admin/crm/layout.tsx`, `components/admin/crm/CrmShell.tsx`, `CrmSidebar.tsx`, `crmNavConfig.ts`.
4. Learn one core CRM workflow: start with leads at `/admin/crm/leads`.
5. Learn one messaging workflow: WhatsApp/QR under `/admin/crm/whatsapp` and `/admin/crm/qr`.
6. Learn database schemas: `lib/schemas/enterpriseSchemas.ts`, then feature-specific schema files.
7. Learn scripts only as needed. Many root and `scripts/` files are one-off diagnostics.

## Maintenance Plan

### Phase 1: Understand and document

- Keep this guide updated when you learn a feature.
- Add small feature notes under `docs/features/` for big areas like leads, WhatsApp, payments, and KP astrology.
- Identify which root scripts are still useful and which are historical.

### Phase 2: Organize safely

- Do documentation-only cleanup first.
- Move historical reports into `docs/archive/`.
- Move active scripts into clear subfolders such as `scripts/diagnostics/`, `scripts/imports/`, `scripts/whatsapp/`, `scripts/accounting/`.
- Before moving scripts, check whether package scripts, deployment files, or docs reference them.
- Do not reorganize app routes until you understand production URLs; moving routes changes public/admin URLs.

### Phase 3: Improve quality

- Fix TypeScript/lint/test failures in small batches.
- Standardize API responses in high-traffic routes.
- Reduce duplicated CRM UI patterns by using `components/admin/crm/ui/`.
- Add smoke tests around payments, lead creation, WhatsApp webhook handling, and login.
- Improve navigation labels and dead-link handling inside CRM.

## Safe First Tasks

These are good starting tasks because they improve maintainability without changing production behavior:

1. Make a route inventory document for the public site.
2. Make a route inventory document for admin CRM.
3. Audit root scripts and classify them as active, diagnostic, import, or archive.
4. Verify the dev server starts locally.
5. Run type-check and record the first real errors.
6. Pick one page, trace its API calls, and document its data flow.

