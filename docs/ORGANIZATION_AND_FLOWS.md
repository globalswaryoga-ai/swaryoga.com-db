# Website Organization And Flow Fix Plan

This file is a working plan for making the Swar Yoga repo and website easier to maintain. It is not a list of random refactors. The goal is to keep the website stable while slowly making pages, flows, folders, scripts, and admin tools easier to understand.

## Main Goal

Make the project more organized without breaking live URLs, payments, registrations, WhatsApp, CRM, or admin workflows.

The safest order is:

1. Document current flows.
2. Fix confusing navigation and duplicate routes.
3. Organize scripts/docs/assets.
4. Improve page structure and shared components.
5. Improve code quality, tests, and error handling.

## Current Website Flows

### 1. Public Visitor Flow

Current flow:

```text
Home
-> About / Blog / Media / Contact
-> Workshop / E-Learning / Community / Resort / Ritucharya
```

Important files:

- `app/page.tsx`
- `components/Navigation.tsx`
- `components/Footer.tsx`
- `app/about/page.tsx`
- `app/contact/page.tsx`
- `app/blog/page.tsx`
- `app/media/page.tsx`

Current issues:

- Public navigation mixes many different products: workshops, e-learning, resort, ritucharya, community, media.
- The main CTA on homepage goes to `/workshop`, while there is also `/workshops`.
- Some routes look old or misspelled, for example `app/workshop/registretion/...`.
- Homepage has inline styles and hardcoded remote images.

Fix plan:

- Decide one canonical workshop URL: preferably `/workshops`.
- Keep old `/workshop` routes only as redirects or compatibility pages.
- Move homepage section data into a small config file.
- Replace hardcoded repeated page links with shared navigation config.
- Audit public nav so it has only the most important visitor actions.

First cleanup completed:

- Public navigation now points to `/workshops`.
- Homepage workshop CTAs now point to `/workshops`.
- `/workshop` now redirects to `/workshops` so older links keep working.

### 2. Workshop Discovery And Registration Flow

Current flow:

```text
Home / Navigation
-> /workshop or /workshops
-> Workshop detail page
-> Select mode/date/language
-> Registration form
-> Checkout/payment
-> Payment success/pending/failed
```

Important route areas:

- `app/workshop/page.tsx`
- `app/workshops/page.tsx`
- `app/workshops/[slug]/page.tsx`
- `app/workshops/[slug]/register/page.tsx`
- `app/workshops/[slug]/[mode]/[language]/form/page.tsx`
- `app/registration/[mode]/[language]/[workshop]/page.tsx`
- `app/checkout/page.tsx`
- `app/payment-success/page.tsx`
- `app/payment-failed/page.tsx`
- `app/payment-pending/page.tsx`
- `app/api/workshops/*`
- `app/api/payments/*`

Current issues:

- There are multiple workshop route systems: `/workshop`, `/workshops`, `/registration`, old ID routes, and misspelled `registretion`.
- This makes it hard to know which page is live and which is legacy.
- Payment flows need extra caution because broken URLs can lose real registrations.

Fix plan:

- Create a route inventory for all workshop pages.
- Mark each route as `active`, `legacy`, or `redirect`.
- Pick one active registration path.
- Add redirects from old routes to the active route after testing.
- Document payment return URLs and webhook routes.
- Add smoke tests for registration and payment route availability.

### 3. E-Learning Flow

Current flow:

```text
Visitor
-> /e-learning
-> Course detail
-> Enroll or purchase
-> Videos / Learn page
-> Progress / assignments / certificate
```

Important route areas:

- `app/e-learning/page.tsx`
- `app/e-learning/[slug]/page.tsx`
- `app/e-learning/[slug]/videos/page.tsx`
- `app/e-learning/[slug]/learn/page.tsx`
- `app/admin/crm/e-learning/*`
- `app/api/recorded-courses/*`
- `app/api/admin/e-learning/*`

Current issues:

- Public course pages and admin course tools are far apart.
- Some e-learning API names use `recorded-courses`, while pages use `e-learning`.
- AI video/RAG video features add another layer that should be documented separately.

Fix plan:

- Document the course data model and status states.
- Decide naming convention: `e-learning` for product UI, `recorded-courses` for database/API if already established.
- Add feature notes for course creation, enrollment, video access, certificate generation.
- Add route smoke tests for public and admin course pages.

### 4. Community Flow

Current flow:

```text
Visitor/User
-> /community
-> Join/request access
-> Community feed
-> Recordings / posts / questions / tips / transformations
```

Important route areas:

- `app/community/page.tsx`
- `app/community/[communityId]/page.tsx`
- `app/community/post/*`
- `app/community/recordings/page.tsx`
- `app/my/communities/page.tsx`
- `app/admin/community/*`
- `app/admin/crm/community/*`
- `app/api/community/*`
- `app/api/admin/community/*`
- `app/api/admin/crm/community/*`

Current issues:

- There are three admin-ish community areas: `/admin/community`, `/admin/communities`, and `/admin/crm/community`.
- Public community pages are okay conceptually, but admin ownership is unclear.
- Recording/video access is security-sensitive and should be documented.

Fix plan:

- Decide which admin area is the real home for community management.
- Keep older admin pages as links or redirects only if still needed.
- Document member access rules and private video access rules.
- Add tests around protected video and community membership checks.

### 5. Life Planner And Ritucharya Flow

Current flow:

```text
Visitor/User
-> /life-planner
-> Signup/login
-> Dashboard
-> Daily tasks, goals, routines, health, vision, notes, ritucharya
```

Important route areas:

- `app/life-planner/page.tsx`
- `app/life-planner/login/page.tsx`
- `app/life-planner/signup/page.tsx`
- `app/life-planner/dashboard/*`
- `app/life-planner/ritucharya/*`
- `app/api/life-planner/*`
- `app/api/ritucharya/*`
- `components/life-planner/*`
- `components/ritucharya/*`

Current issues:

- Life Planner has many dashboard pages and overlaps with CRM planner dashboard pages.
- Some state may be localStorage based, some API based.
- The relationship between public Life Planner and admin CRM planner is not obvious.

Fix plan:

- Document where Life Planner data is stored.
- Separate user-facing planner docs from CRM planner docs.
- Standardize auth checks and empty states.
- Create a dashboard navigation map.

### 6. Admin CRM Flow

Current flow:

```text
Admin login
-> /admin/crm
-> CRM shell/sidebar/subnav
-> Leads / WhatsApp / QR / Sales / Reports / Media / Settings / E-learning / KP Astro
```

Important files:

- `app/admin/crm/layout.tsx`
- `components/admin/crm/CrmShell.tsx`
- `components/admin/crm/CrmSidebar.tsx`
- `components/admin/crm/CrmSubNav.tsx`
- `components/admin/crm/crmNavConfig.ts`
- `components/admin/crm/ui/*`
- `lib/schemas/enterpriseSchemas.ts`
- `app/api/admin/crm/*`

Current issues:

- CRM is the largest area: around 202 pages and 319 API routes.
- Navigation is powerful but very dense.
- Some pages overlap with legacy `/admin/*` pages.
- Some route groups are feature-complete products by themselves.

Fix plan:

- Do not reorganize CRM URLs first. Start with documentation and navigation clarity.
- Split CRM documentation into feature notes:
  - Leads and funnel
  - WhatsApp Meta
  - QR WhatsApp bridge
  - Broadcasts/templates
  - Sales/accounting
  - E-learning admin
  - Community admin
  - KP astrology
  - Sadhana scheduler
  - Tenant/billing/admin users
- Add a simple owner/status field to each CRM nav item later: `active`, `legacy`, `admin-only`, `super-admin`.
- Use shared CRM UI primitives from `components/admin/crm/ui/` more consistently.

### 7. WhatsApp And Messaging Flow

Current flow:

```text
Lead/customer
-> Meta webhook or QR bridge webhook
-> Message storage
-> CRM inbox/conversation
-> Reply/template/broadcast/chatbot automation
```

Important route areas:

- `app/api/whatsapp/*`
- `app/api/webhooks/*`
- `app/api/admin/crm/whatsapp/*`
- `app/api/admin/crm/qr/*`
- `app/admin/crm/whatsapp/*`
- `app/admin/crm/qr/*`
- `deploy/wa-baileys/*`
- `deploy/systemd/*`
- many `check-*`, `diagnose-*`, `test-*` scripts

Current issues:

- Meta Cloud API and QR/Baileys bridge are both present.
- There are many one-off scripts in root and `scripts/`, making it hard to know what is safe to run.
- Messaging touches production data and should be handled carefully.

Fix plan:

- Make a WhatsApp architecture doc.
- Classify scripts:
  - health check
  - diagnostic
  - repair
  - migration/backfill
  - dangerous production action
- Add warnings to scripts that mutate production data.
- Build a safe command list for daily maintenance.

### 8. Payment Flow

Current flow:

```text
Registration/checkout
-> Create payment
-> PayU or Cashfree
-> Return/callback/webhook
-> Verify payment
-> Create/update order, enrollment, lead, receipt
```

Important route areas:

- `app/api/payments/payu/*`
- `app/api/payments/cashfree/*`
- `app/api/orders/*`
- `app/api/admin/orders/*`
- `app/payment-success*`
- `app/payment-failed`
- `app/payment-pending`
- `components/PaymentButton.tsx`
- `components/WorkshopPaymentButton.tsx`
- `components/CashfreePaymentButton.tsx`
- `components/PayUPaymentButton.tsx`

Current issues:

- There are multiple payment components and result pages.
- Payment flows are high-risk: do not rename routes without checking provider callback URLs.
- Receipt/order/enrollment side effects need documentation.

Fix plan:

- Document every payment provider callback URL.
- Document which page creates orders and which webhook verifies them.
- Add test checklist before payment changes.
- Keep old return pages working even if UI changes.

## Repo Organization Problems To Fix

### Problem 1: Too many root scripts

There are many root-level scripts like `check-*`, `test-*`, `diagnose-*`, `fix-*`, and `verify-*`.

Fix:

- Keep only daily-use scripts in root if needed.
- Move the rest into:
  - `scripts/diagnostics/`
  - `scripts/repairs/`
  - `scripts/imports/`
  - `scripts/accounting/`
  - `scripts/whatsapp/`
  - `scripts/archive/`
- Before moving, search references in package scripts, docs, deployment files, and cron configs.

### Problem 2: Markdown docs ignored by default

`.gitignore` currently ignores most `.md` files, with exceptions.

Fix:

- Keep important docs explicitly unignored.
- Avoid creating important docs that Git silently ignores.
- Later, clean the `.gitignore` markdown section so it matches the comment.

### Problem 3: Duplicate route names

Examples:

- `/workshop` and `/workshops`
- `/payment-success` and `/payment-successful`
- `/admin/community`, `/admin/communities`, `/admin/crm/community`
- `/admin/crm/templates`, `/admin/crm/meta/templates`, `/admin/crm/whatsapp/templates`

Fix:

- Make a route status table.
- Decide canonical route for each feature.
- Add redirects only after checking production usage.
- Keep API routes stable unless frontend and webhook callers are updated.

### Problem 4: Mixed admin products

The repo has legacy website admin, CRM admin, CRM-site SaaS/product pages, and tenant/subscription flows.

Fix:

- Define admin areas:
  - `/admin`: website admin
  - `/admin/crm`: internal/admin CRM
  - `/crm-site`: CRM product/tenant website
- Avoid adding new CRM features under legacy `/admin` unless they belong there.

### Problem 5: Shared UI is inconsistent

There are many components, but some pages likely use custom local UI.

Fix:

- For CRM, prefer `components/admin/crm/ui/`.
- For public pages, standardize page sections, buttons, cards, forms.
- Do not do a giant visual refactor. Improve one feature page at a time.

## Priority Change List

### Priority 1: Safe organization

- Add docs for route inventory.
- Add docs for WhatsApp architecture.
- Add docs for payment flow.
- Add docs for CRM feature ownership.
- Classify scripts before moving anything.

### Priority 2: Navigation cleanup

- Pick canonical workshop route.
- Audit public nav labels and order.
- Audit CRM nav for dead links and duplicate destinations.
- Mark legacy admin pages.

### Priority 3: Reliability

- Run `npm run type-check` and document current errors.
- Run `npm test` and document current failures.
- Add smoke tests for public routes, admin CRM shell, payment routes, and WhatsApp webhook routes.
- Fix broken imports and dead pages in small batches.

### Priority 4: User experience improvements

- Make homepage CTA and workshop flow clearer.
- Improve mobile navigation if crowded.
- Add better loading/empty/error states in CRM lists.
- Improve form validation on registration, leads, and payments.

### Priority 5: Code cleanup

- Move repeated page constants into config files.
- Use shared API response helpers.
- Use shared logging.
- Reduce duplicated payment button logic.
- Reduce duplicated WhatsApp/template logic.

## First 10 Practical Tasks

1. Create `docs/ROUTE_INVENTORY_PUBLIC.md`.
2. Create `docs/ROUTE_INVENTORY_ADMIN_CRM.md`.
3. Create `docs/WHATSAPP_FLOW.md`.
4. Create `docs/PAYMENT_FLOW.md`.
5. Create `docs/SCRIPT_INVENTORY.md`.
6. Run a route dead-link check for navigation links.
7. Decide `/workshop` vs `/workshops` canonical route.
8. Trace one complete registration to payment flow.
9. Trace one complete lead to WhatsApp reply flow.
10. Run type-check and test, then fix the first small batch of real errors.

## What Not To Change Yet

- Do not rename payment callback routes.
- Do not delete old workshop routes.
- Do not move production repair scripts before classifying them.
- Do not change WhatsApp webhook behavior without a test.
- Do not reorganize `/admin/crm` URLs until the nav and route inventory are clear.

## Recommended Next Step

Start with a route inventory for public pages. It is the easiest win and helps decide what users actually see first.

## Known Type-Check Errors

Command used:

```bash
npm run type-check
```

Status after the first public visitor flow cleanup:

- Type-check still fails.
- The reported errors are outside the public flow files changed in this branch.
- Treat these as existing repo cleanup tasks to fix in later batches.

Current error summary:

| Errors | File |
| ---: | --- |
| 13 | `app/admin/crm/planner-dashboard/accounting/page.tsx:1438` |
| 3 | `app/admin/crm/ritucharya/diet-plan/page.tsx:57` |
| 2 | `app/admin/crm/ritucharya/dietary-recommendations/page.tsx:327` |
| 1 | `app/admin/crm/ritucharya/logic/page.tsx:86` |
| 3 | `app/admin/crm/sales/page.tsx:2114` |
| 2 | `app/admin/enquiries/page.tsx:319` |
| 4 | `app/admin/videos/page.tsx:457` |
| 1 | `app/api/admin/crm/admin-activity/route.ts:274` |
| 2 | `app/api/admin/crm/funnel/config/route.ts:50` |
| 2 | `app/api/admin/crm/funnel/route.ts:27` |
| 1 | `app/api/admin/crm/integration-hub/route.ts:32` |
| 1 | `app/api/admin/crm/knowledge-base/search/route.ts:49` |
| 1 | `app/api/admin/crm/sales/generate-from-leads/route.ts:102` |
| 1 | `app/api/admin/crm/sales/route.ts:121` |
| 1 | `app/api/admin/crm/sales/tally-sync/route.ts:94` |
| 3 | `app/api/admin/crm/whatsapp/diagnostics/route.ts:75` |
| 3 | `app/api/admin/crm/whatsapp/qr-bridge/route.ts:153` |
| 13 | `app/api/admin/signups/[id]/reset-password/route.ts:61` |
| 1 | `app/api/admin/unified-profile/route.ts:116` |
| 6 | `app/api/crm-site/compartment/route.ts:111` |
| 1 | `app/api/crm-site/plan/route.ts:99` |
| 9 | `app/api/crm-site/setup-status/route.ts:77` |
| 3 | `components/ActionPlanModal.tsx:114` |
| 3 | `components/admin/crm/PlanComponents.tsx:102` |
| 1 | `components/AdminSidebar.tsx:373` |
| 1 | `components/BunnyVideoPlayer.tsx:30` |
| 3 | `components/EnhancedVisionBuilder.tsx:24` |
| 3 | `components/GoalManager.tsx:31` |
| 4 | `components/VisionForm.tsx:33` |
| 1 | `components/VisionFormWithCategories.tsx:141` |
| 3 | `lib/backup/bunny-client.ts:43` |
| 1 | `lib/backup/index.ts:46` |
| 1 | `lib/bunny-storage.ts:642` |
| 1 | `lib/bunny/bunnyUpload.ts:45` |
| 6 | `lib/chatbot/knowledge-bot.ts:58` |
| 4 | `lib/course-certificate-generator.ts:72` |
| 2 | `lib/crm/apiGuards.ts:16` |
| 2 | `lib/crm/planGuards.ts:14` |
| 3 | `lib/errorTracking.ts:122` |
| 1 | `lib/lifePlannerMongoStorage.ts:159` |
| 1 | `lib/qrSessionIsolation.ts:74` |
| 4 | `lib/sadhanaSchedulerService.ts:142` |
| 1 | `lib/safeGroupMerge.ts:143` |
| 2 | `lib/schemas/rituDietaryRecommendations.ts:117` |
| 2 | `lib/zoomBotService.ts:91` |

Suggested fix order:

1. Fix missing imports/modules first: `lib/crm/apiGuards.ts`, `lib/crm/planGuards.ts`, `app/admin/enquiries/page.tsx`.
2. Fix repeated Mongoose `findOne`/lean typing issues in API routes.
3. Fix Life Planner type shape mismatches around `Vision`, `Goal`, `Word`, and `Milestone`.
4. Fix media/video form types.
5. Re-run `npm run type-check` after each small batch.
