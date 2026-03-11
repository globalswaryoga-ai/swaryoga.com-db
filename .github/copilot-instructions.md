# Swar Yoga Web App & CRM - AI Instructions

**🔔 CRITICAL RULE FOR ALL AGENTS: Before starting ANY new work or correction, ALWAYS:**
1. **Read the most recent "Recent Changes Log"** in this file (`📋 Recent Changes Log` section) to understand what has been done
2. **Check `.md` files for documentation** of the feature/area you're working on
3. **Update this file** when completing new work — add an entry to the "Recent Changes Log" with commit hash
4. **Follow the established patterns** — don't reinvent the wheel

This ensures all work is properly documented, prevents duplicate effort, and maintains consistency across the codebase.

---

## 👥 User Role Hierarchy (CRITICAL — use these names everywhere)

| Role | Description | Identified By | Access Level |
|------|-------------|---------------|--------------|
| **Super Admin** | Owner of CRM and swaryoga.com | `userId: 'admin'` or `'admincrm'` ONLY (hardcoded in `SUPER_ADMIN_IDS` set). Do NOT use `role` or `permissions` — those can be set on tenant users. | Full access to everything. Owns shared QR WhatsApp bridge session. |
| **Super Admin Team** | Team members working under Super Admin | `qrWhatsappEnabled: true` in `crm_user_settings`, NOT super admin | Sees only leads assigned to or created by them. Uses shared bridge. |
| **CRM Admin (Tenant)** | Independent user who signed up via crm.swaryoga.com | Has own `qrBridgeUrl` in settings | Full access to their own bridge. Own WhatsApp session. |
| **CRM Admin Team** | Team users added by a CRM Admin | `qrWhatsappEnabled: true` under their tenant's bridge | Sees only their assigned/created leads on tenant's bridge. |
| **Leads** | End-users / contacts. NOT admin users. | Stored in `leads` collection | No CRM login. Contacted via WhatsApp/email. |

### Role check functions (in `lib/crm-handlers.ts`):
- `isSuperAdmin(decoded)` → `true` for Super Admin only
- `getViewerUserId(decoded)` → returns the user's ID string
- `tenantFilter(decoded)` → returns MongoDB filter for multi-tenant data isolation

---

## 🏗 Architecture & Data Flow
- **Framework**: Next.js 14 (App Router) with TypeScript and Tailwind CSS.
- **Database**: MongoDB (Atlas). Use `lib/db.ts` for connection and `lib/schemas/enterpriseSchemas.ts` for CRM/messaging models.
- **WhatsApp Integration**:
  - **Meta API (Primary)**: Handled via `app/api/whatsapp/webhook/route.ts`. Preferred for production.
  - **QR WhatsApp (Baileys Bridge)**: QR code scanning via external bridge service. Proxy at `app/api/admin/crm/whatsapp/qr-bridge/route.ts`.
  - **Meta Inbound Ingestion**: Raw webhook payloads are logged in `whatsapp_webhook_events` (CRM DB) via `logWebhookEvent()`.
- **Database Routing**: The app uses two logical databases on the same cluster:
  - `swaryogaDB`: Primary website, user profiles, and Life Planner data.
  - `swaryoga_admin_crm`: CRM leads, WhatsApp logs, audit data, `crm_user_settings`.

---

## 🔐 WhatsApp Access Control (QR Bridge)

### How it works:

```
Frontend (page.tsx) → bridgeCall('/chats') → /api/admin/crm/whatsapp/qr-bridge (proxy) → External Baileys Bridge
```

### Access Gate: `resolveUserBridge()` in qr-bridge/route.ts

| User Role | Has qrBridgeUrl? | qrWhatsappEnabled? | Result |
|-----------|-------------------|---------------------|--------|
| Super Admin | N/A | N/A | ✅ Shared bridge, all chats visible |
| Super Admin Team | No | Yes | ✅ Shared bridge, **filtered** to assigned/created leads only |
| Super Admin Team | No | No | ❌ BLOCKED (422) |
| CRM Admin | Yes | N/A | ✅ Own bridge, all their chats |
| CRM Admin Team | No | Yes | ✅ Tenant bridge, **filtered** |
| Unknown user | No | No | ❌ BLOCKED (422) |

### Chat Privacy Filter (in qr-bridge proxy GET & POST):
- Fetches all chats from bridge
- Looks up `Lead` records by phone number
- Returns only chats where `lead.assignedToUserId === userId` or `lead.createdByUserId === userId`
- On filter error → returns empty (fail-safe, never leaks chats)

### Files involved:
| File | Purpose |
|------|---------|
| `app/api/admin/crm/whatsapp/qr-bridge/route.ts` | Main proxy — access control + chat privacy filter |
| `app/api/admin/crm/whatsapp/qr/send/route.ts` | Send messages via QR bridge — checks `isSuperAdmin` or `qrWhatsappEnabled` |
| `app/api/admin/crm/whatsapp/qr/broadcast/route.ts` | Broadcast via QR bridge — same access check |
| `app/api/admin/crm/whatsapp/qr/chats/route.ts` | Dedicated chats endpoint (NOT used by frontend, kept as backup) |
| `app/api/admin/crm/whatsapp/qr-access/route.ts` | Super Admin only: manage QR access for team users |

---

## 🔐 WhatsApp Access Control (Meta API)

### Files involved:
| File | Purpose |
|------|---------|
| `app/api/admin/crm/messages/route.ts` | Meta WhatsApp inbox — filters by `assignedToUserId` / `createdByUserId` for non-Super Admin |
| `app/api/admin/crm/whatsapp/send/route.ts` | Meta WhatsApp send — checks lead assignment for non-Super Admin |

---

## 🔐 CRM User Settings (`crm_user_settings` collection)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | String | Unique CRM user ID |
| `qrBridgeUrl` | String | Custom bridge URL (CRM Admin tenants only) |
| `qrBridgeSecret` | String | Unique per-user bridge secret |
| `qrWhatsappEnabled` | Boolean | Whether team user can access shared bridge |

### Model access: `getCRMUserSettings()` from `@/lib/schemas/enterpriseSchemas`

---

## 🛠 Critical Developer Workflows
- **Environment**: Use `.env.local`. Required keys: `MONGODB_URI_MAIN`, `MONGODB_CRM_DB_NAME`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`.
- **Diagnostics Scripts**:
  - `node scripts/smoke-prod.js`: Quick environment health check.
  - `node scripts/check-webhook-events.js`: Verify incoming Meta webhook hits.
  - `node scripts/mongo-main-db-report.js`: Database integrity report.
  - `node scripts/enable-qr-access.js`: Bulk enable `qrWhatsappEnabled` for all team users.
- **Initialization**: Always `await connectDB()` at the top of API handlers before accessing models.

---

## 📏 Coding Conventions & Patterns
- **Database Models**: 
  - ALWAYS use getter functions (e.g., `getLead()`, `getWhatsAppMessage()`, `getCRMUserSettings()`) from `@/lib/schemas/enterpriseSchemas`.
  - Avoid legacy Proxy exports (e.g., `const { Lead } = ...`) in new modules.
- **API Security**: CRM routes must verify admin status using `verifyToken` and `decoded.isAdmin`. Use `getViewerUserId(decoded)` and `isSuperAdmin(decoded)` from `@/lib/crm-handlers` for multi-user filters.
- **Standardized Responses**: Use `apiError` and `apiSuccess` from `@/lib/api-error.ts`.
- **Phone Normalization**: Use `normalizePhone` from `@/lib/whatsapp` (removes non-digits, prefixes '91' for 10-digit IN numbers).
- **CRM Frontend**: Use unified hooks (`useAuth`, `useCRM`, `useSearch`, `useModal`) and components from `@/components/admin/crm/`.
- **Role Naming**: Always use the 5-role hierarchy above. Never say "regular admin" — say "Super Admin Team" or "CRM Admin".

---

## 🖥 Key Frontend Pages

### QR WhatsApp (`app/admin/crm/qr/page.tsx`)
- Tabs: Connection, Inbox, Settings
- Auto-provisioning: When tenant first loads, silently generates unique bridge URL + secret if missing
- Shows QR code immediately on Connection tab (no manual setup dialog)
- Fetches chats via `bridgeCall('/chats')` → qr-bridge proxy (GET)
- Sends messages via `bridgeCall('/send', 'POST', body)` → qr-bridge proxy (POST)
- Settings component: `app/admin/crm/qr/components/SettingsTab.tsx`
  - Bridge Configuration (URL + Secret) — `saveBridgeConfig` validates URL starts with http:// or https://
  - Funnel Stages, Label Presets, Sender Display Name
  - **QR Access Control** (Super Admin only): toggle `qrWhatsappEnabled` per team user + view Bridge Secret with copy button
  - Compartment Info

### Meta WhatsApp (`app/admin/crm/meta/`)
- Uses `/api/admin/crm/messages` for inbox (auto-filtered per user)
- Uses `/api/admin/crm/whatsapp/send` for sending

### Sidebar (`components/AdminSidebar.tsx`)
- Categorized navigation with expandable sections
- Storage usage indicator (Super Admin only)
- Super Admin section: Super Admin, CRM Users, E-Learning, Tenants, Permissions, Admin Activity
- `superAdminOnly` flag on sidebar items for Super Admin-exclusive features

### Middleware (`middleware.ts`)
- Handles subdomain routing (crm.swaryoga.com → /admin/crm)
- Excludes: `/lp` (landing pages), static assets, API routes

---

## 🔌 Integration Points
- **Payments**: Unified logic in `app/api/payments/` for PayU (India) and Cashfree.
- **Panchang**: Native server-side calculations in `lib/calendarCalculations.ts`.
- **Chatbot Flows**: `app/api/admin/crm/chatbot/flows/route.ts` — uses `tenantFilter()` for multi-tenant isolation.
- **Chatbot Config**: `app/api/admin/crm/chatbot/config/route.ts` — per-tenant chatbot settings.

---

## ⚠️ Known Issues / Warnings
- **Database Initialization**: Models accessed before `connectDB()` will fail; dynamic imports or getters are used to satisfy this.
- **Meta Verification**: The Hub Verify Token is configured via `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- **Deprecated Bridge**: Ignore `deploy/wa-bridge/` for new WhatsApp features.
- **reply-crm.swaryoga.com**: Shows `DEPLOYMENT_NOT_FOUND`. Needs Vercel Dashboard + DNS config (not a code issue).
- **Chat privacy is server-side only**: The qr-bridge proxy filters chats. The bridge itself has no concept of lead ownership.
- **Unused endpoint**: `/api/admin/crm/whatsapp/qr/chats` has filtering but is NOT called by the frontend. Frontend uses qr-bridge proxy.

---

## 📋 Recent Changes Log

### QR WhatsApp Tenant Onboarding & Auto-Provisioning (Session: March 11, 2026 — Phases 18–22)

1. **No WhatsApp Bridge Configured Error Fix** — Commit `2ab1d5d6`
   - Fixed 422 errors auto-redirecting all CRM tenants without bridge URL to Settings tab
   - `resolveUserBridge()` now returns typed `BridgeResolution` with `ok: true/false, reason: 'no_bridge' | 'unauthorized'`
   - Frontend `bridgeCall` detects NO_BRIDGE errors and toggles `bridgeConfigured` state
   - Error banner now shows only non-bridge errors (filters out bridge setup messages)

2. **Tenant Owner Security Block** — Commit `2a5200c1`
   - Security fix: Blocked CRM tenant owners from accessing Super Admin's shared QR bridge
   - `resolveUserBridge()` checks `tenants` collection for `ownerUserId`/`adminUserId`/`ownerEmail`
   - If tenant is owner → returns `{ ok: false, reason: 'no_bridge' }` (prevents unauthorized access)
   - Same check added to `qr/send/route.ts` and `qr/broadcast/route.ts`
   - Imports `mongoose` for direct collection queries (safer than model access before connectDB)

3. **NO_BRIDGE Message String Detection** — Commit `a2afbede`
   - Fixed raw "NO_BRIDGE" text appearing on screen (custom property was stripped during throw/catch)
   - `fetchStatus` now detects bridge errors by message string: `'NO_BRIDGE'`, `'bridge configured'`, `'bridge URL'`
   - Error banner filters these strings before displaying
   - Prevents confusing error messages for tenants without configured bridges

4. **Tenant QR Onboarding Card & URL Validation** — Commit `54eef74a`
   - Added onboarding card on Connection tab when `bridgeConfigured === false`
   - 3-step setup guide: Deploy bridge → Enter URL → Scan QR
   - "Configure Bridge URL" button navigates to Settings tab
   - Bridge URL validation in `saveBridgeConfig`: rejects non-http/https URLs
   - Updates Settings tab banner to clarify "Bridge URL is NOT your email or password"

5. **Auto-Provision Bridge URL/Secret for Tenants** — Commit `3e492def`
   - **NEW ENDPOINT**: `POST /api/admin/crm/whatsapp/qr/auto-provision`
     - Silently generates unique bridge URL + secret for new tenants on first load
     - Pattern: `{FALLBACK_BRIDGE_URL}/user/{userId}/{uniqueId}`
     - Generates random 32-char secret per user
     - Saves to `crm_user_settings` collection
   - QR page auto-provision on load: if bridge URL missing, calls auto-provision endpoint silently
   - **Removed manual setup UX**: Tenants see QR code immediately (no onboarding dialog or Settings redirect)
   - Super Admin still uses shared bridge (unchanged)
   - Benefit: Tenants don't need to understand "bridge URL" concept — just scan QR code

### Chat Privacy & Role Protection (Session: March 2026)

1. **Middleware Landing Page Fix** — `middleware.ts`
   - Added `!p.startsWith('/lp')` to CRM subdomain rewrite exclusion
   - Landing pages at `crm.swaryoga.com/lp/*` now resolve correctly

2. **Super Admin QR WhatsApp Protection** — Multiple files
   - `qr-bridge/route.ts`: Added `resolveUserBridge()` gate with `SUPER_ADMIN_IDS`
   - `qr/send/route.ts`: Added access check — blocks users without bridge or `qrWhatsappEnabled`
   - `qr/broadcast/route.ts`: Same access check pattern

3. **Chat Privacy Filter** — `qr-bridge/route.ts`
   - Added server-side chat filtering in BOTH GET and POST handlers
   - Non-Super Admin on shared bridge only sees chats for leads assigned to or created by them
   - Fail-safe: on error returns empty (never leaks chats)

4. **Bridge Secret Visibility** — `qr/components/SettingsTab.tsx` + `qr-access/route.ts`
   - Super Admin can view each user's unique Bridge Secret in QR Access Control table
   - Eye icon toggles visibility, copy button with clipboard feedback
   - API now returns `bridgeSecret` field

5. **Role Naming Convention** — `crm-handlers.ts`, `qr-bridge/route.ts`, `.github/copilot-instructions.md`
   - Standardized 5-role hierarchy: Super Admin, Super Admin Team, CRM Admin, CRM Admin Team, Leads
   - Updated all JSDoc comments to use consistent names
---

## 📝 Documentation Workflow (MANDATORY)

### Before Starting Any Work:
1. **Always read copilot-instructions.md "Recent Changes Log"** to see what's been done
2. **Search for related .md files** in `/docs/` and root to understand the feature context
3. **Check GitHub commit messages** from recent work to understand patterns and dependencies

### When Completing Work:
1. **Add an entry to "Recent Changes Log"** in this file IMMEDIATELY after committing
2. **Format**: Include commit hash, date, files modified, and key changes
3. **Be specific**: Describe WHAT changed, WHERE, and WHY
4. **Keep it brief** but complete — aim for 3-5 bullet points per entry

### Documentation Standards:
- **Commit messages**: Should be descriptive (`feat:`, `fix:`, `refactor:` prefixes)
- **Code comments**: JSDoc for public functions, inline comments for complex logic
- **README.md files**: Update feature-specific README files if behavior changes
- **Avoid duplication**: Link to files rather than repeating documentation

### Example Entry Format:
```
### Feature Name (Session: Month DD, Year — Phase X) — Commit `abcd1234`
- **Sub-task 1** — file.tsx
  - What was changed
  - Why it was needed
  - Acceptance criteria met
- **Sub-task 2** — route.ts
  - Description
  - Files affected
  - Testing status
```