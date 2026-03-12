# QR WhatsApp Acceptance Playbook

**Created:** March 12, 2026  
**Owner:** Super Admin / CRM Engineering  
**Purpose:** Reusable production test script for QR scan success, sender-header visibility, privacy isolation, stale-chat prevention, and session freshness.

---

## When to Use This

Use this playbook:

- after any QR bridge deploy
- after any QR inbox/header/settings code change
- after any privacy or session-isolation fix
- after onboarding changes for new CRM tenants
- before declaring QR WhatsApp "done"

---

## Final Pass Criteria

A user passes QR acceptance only when all of the following are true:

- QR scan completes successfully
- page shows connected state
- header shows the scanned WhatsApp sender number clearly
- refresh keeps the correct sender visible
- chat list contains only that user's current session chats
- no old chats from a previous scanned account appear
- inbound and outbound messages update correctly
- reconnect/logout/login do not leak stale history
- chat count is sane and matches the real session expectation
- no runtime crash or redirect loop occurs

---

## Test User Groups

Run this for each active role type.

### Group A — Super Admin

- `admincrm`

### Group B — CRM Admin (Tenant)

- active tenant owners who use their own QR session

### Group C — Super Admin Team

- users with `qrWhatsappEnabled: true` on the shared bridge

### Group D — CRM Admin Team

- team members under a tenant bridge with assigned/created-lead visibility

---

## Pre-Test Setup

Before starting a round of testing:

1. Confirm production health is good
   - Anti-Bug page loads
   - Anti-Bug smoke passes
   - provisioning audit reports zero gaps
2. Pick a small verified user batch first
   - 1 Super Admin
   - 1 CRM Admin
   - 1 Super Admin Team user
   - 1 CRM Admin Team user
3. For each user under test, note:
   - user email / login
   - role type
   - expected scanned phone number
   - whether the bridge session should be shared or isolated
4. Ensure at least one test contact exists for send/receive verification
5. Clear browser confusion between accounts
   - use separate browser profiles or private windows
   - never test two users in the same session tab stack

---

## Fast Production Sanity Check

Run these before the user-by-user pass:

- Anti-Bug page responds on production
- Anti-Bug smoke returns healthy
- provisioning audit returns zero gaps
- QR page loads without runtime crash

Record result as:

- `PASS` if all four checks succeed
- `BLOCKED` if any one fails

---

## Per-User Acceptance Script

Repeat the full sequence below for each active user.

### 1) Login and Load

- log in as the target user
- open `/admin/crm/qr`
- confirm the page loads without redirect loop or fatal error
- confirm Connection / Inbox / Settings tabs render normally

**Pass if:** page loads normally and stays authenticated.

### 2) QR Availability

- if not connected, confirm QR code appears on the Connection tab
- if already connected, confirm current session status is visible
- if QR is missing, note the exact bridge/status message shown

**Pass if:** user can either scan QR or clearly see an already-connected session.

### 3) Scan and Connect

- scan the QR with the intended WhatsApp account
- wait for connection state to change
- confirm the UI changes to connected without manual hacks

**Pass if:** connection succeeds in normal UI flow.

### 4) Header Sender Verification

- confirm the header shows the scanned sender number
- expected format: `Connected · +91 ...` or equivalent final approved wording
- refresh the page once
- confirm the same sender number still appears after refresh

**Pass if:** sender number is visible before and after refresh.

### 5) Chat Isolation Verification

- inspect the chat list
- confirm chats belong only to the current user's visible scope
- verify obviously foreign chats are absent
- for shared/team users, confirm visibility is limited to assigned/created leads only

**Pass if:** no foreign or leaked chat history appears.

### 6) Stale History Verification

- reconnect or refresh the page
- compare current chat list with what should belong to the current scanned number
- verify older chats from previously scanned accounts do not reappear

**Pass if:** current session remains clean after reconnect/refresh.

### 7) Chat Count Sanity Check

- note the visible chat count in the UI
- compare it to expected real session scale
- if count looks inflated, capture whether the extra rows look synthetic, stale, or foreign

**Pass if:** count appears sane for the current scanned account.

### 8) Inbound Freshness Test

- send a WhatsApp message from a real external phone to the scanned account
- confirm the message appears in the correct thread
- confirm ordering, timestamp, and unread behavior are reasonable

**Pass if:** inbound appears quickly in the correct place.

### 9) Outbound Freshness Test

- send a reply from CRM QR inbox
- confirm it appears in the thread without duplication
- confirm the external phone receives it

**Pass if:** outbound send is visible in CRM and on the recipient device.

### 10) Session Persistence Check

- logout and log back in as the same user
- revisit `/admin/crm/qr`
- verify sender header, chat list, and current session still match that user

**Pass if:** same user returns to the same correct session state.

---

## New-Tenant Signup Verification

Run this once after major signup/onboarding changes.

1. create a fresh CRM tenant account from `crm.swaryoga.com`
2. complete signup
3. confirm redirect lands on `/admin/crm/qr`
4. confirm QR page can auto-provision without manual bridge setup
5. confirm the new user has:
   - `crm_user_settings`
   - `permanentTenantId`
   - `qrBridgeSecret`
   - `user_compartments`
   - `crm_tenants`
   - `tenant_setup`
6. confirm the new tenant can scan and see the sender in the header

**Pass if:** a truly new tenant reaches working QR-first onboarding end to end.

---

## Privacy Regression Checklist

Use this after any QR privacy or bridge routing change.

- [ ] shared-bridge team user cannot see non-owned chats
- [ ] tenant-isolated user does not inherit shared-bridge history
- [ ] old scanned-number history does not come back after reconnect
- [ ] message endpoints do not return data for foreign chats
- [ ] header sender belongs to the active scanned account
- [ ] chat count stays bounded to current session

---

## Failure Triage Guide

### If QR does not appear

Check:

- Anti-Bug page
- bridge health
- auto-provision result
- user settings record
- auth/session expiry

### If header sender is missing

Check:

- `/status` response shape
- saved `qrConnectedPhoneNumber`
- `/api/admin/crm/settings` recovery path
- refresh persistence

### If foreign chats appear

Check:

- shared vs isolated bridge resolution
- server-side filter path in `qr-bridge/route.ts`
- session-scoped chat source selection
- `qrPhoneChangedAt` / scan timestamp behavior

### If counts look inflated

Check:

- whether the list came from bridge history vs session-scoped Mongo data
- whether old session data survived reconnect
- whether synthetic/non-real rows were reintroduced

---

## Suggested Result Template

Copy this block for each tested user.

## User Result — `<email or userId>`

- Role: `<Super Admin | CRM Admin | Super Admin Team | CRM Admin Team>`
- Expected sender: `<phone>`
- Scan success: `PASS | FAIL | BLOCKED`
- Header visible after connect: `PASS | FAIL`
- Header persists after refresh: `PASS | FAIL`
- No foreign chats: `PASS | FAIL`
- No stale old chats: `PASS | FAIL`
- Chat count sane: `PASS | FAIL`
- Inbound freshness: `PASS | FAIL`
- Outbound freshness: `PASS | FAIL`
- Logout/login persistence: `PASS | FAIL`
- Notes: `<observations>`

---

## Recommended Execution Order

1. run fast production sanity checks
2. test one user from each role group
3. if clean, expand to all active users
4. run one fresh-new-tenant signup test
5. save results back into the master QR todo or session notes
6. re-run this playbook after every QR bridge or QR UI deploy

---

## Exit Rule

Do **not** declare QR WhatsApp fully complete until:

- every critical user group has passed
- one fresh new tenant has passed QR-first onboarding
- no cross-user leak is observed
- no stale chat resurrection is observed
- header sender visibility is consistent after refresh
