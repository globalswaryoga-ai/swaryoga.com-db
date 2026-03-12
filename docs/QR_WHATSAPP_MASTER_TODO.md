# QR WhatsApp Master Todo

**Created:** March 12, 2026  
**Owner:** Super Admin / CRM Engineering  
**Purpose:** Single reusable checklist for QR WhatsApp stability, privacy, header visibility, and session correctness.

---

## Final Target

Every CRM user should be able to:

1. scan their own QR successfully
2. see the scanned WhatsApp number in the header as connected, for example: `Connected · +91 0000000000`
3. see only their own current QR chats/messages
4. never see another user's old or live chat history
5. see up-to-date chats/messages/status without stale bridge data

---

## Current Status Summary

| Area | Status | Notes |
|---|---|---|
| QR user isolation architecture | 🟡 In progress | Core protections added, must keep validating for all tenants |
| Scanned number in header | 🟡 In progress | Recovery/fallback logic added and combined `Connected · +91...` badge implemented locally; needs full user-by-user confirmation |
| No cross-user chat leakage | 🟡 In progress | Server-side protections added, needs regression verification |
| Up-to-date session-scoped chat list | 🟡 In progress | Session-scoped storage preferred now, must verify across users |
| New-tenant SaaS signup provisioning | ✅ Completed | Signup now provisions QR/SaaS records for new CRM tenants automatically |
| Legacy tenant provisioning cleanup | ✅ Completed | Existing CRM tenant users were audited and repaired so provisioning gaps are now zero |
| Anti-Bug monitoring | ✅ Completed locally | Anti-Bug dashboard + API added locally; deploy/verify still needed |

---

## Completed Work

These items are already implemented in code or completed locally in this repo.

### QR Privacy / Isolation

- [x] Added server-side lead/privacy filtering for shared/team QR access
- [x] Restored normal own-bridge access for isolated tenant sessions
- [x] Added session-change filtering to reduce stale chats from old scanned numbers
- [x] Added session-scoped QR chat/message persistence using:
	- `qr_whatsapp_chats`
	- `qr_whatsapp_messages`
- [x] Updated QR chat source to prefer session-scoped chat storage for isolated tenant sessions

### Header / Sender Number Recovery

- [x] Added fallback recovery for scanned sender number in QR header
- [x] Added persistence for `qrConnectedPhoneNumber`
- [x] Added recovery path from saved settings when live status metadata is incomplete
- [x] Added stronger phone extraction from multiple bridge status shapes
- [x] Updated the main QR header badge locally to show combined format: `Connected · +91 0000000000`

### Chat Labels / Contact Display

- [x] Stopped showing many placeholder/internal labels in sidebar/header
- [x] Prefer saved CRM names when available
- [x] Prefer real phone number with country code when name is missing
- [x] Reduced `Unknown Contact` style fallback behavior

### Runtime Stability

- [x] Fixed known QR page temporal-dead-zone runtime crash paths
- [x] Verified modified QR files had no editor errors
- [x] Verified project production build passes locally

### Anti-Bug System

- [x] Added `app/api/admin/crm/anti-bug/route.ts`
- [x] Added `app/admin/crm/anti-bug/page.tsx`
- [x] Added sidebar entry for `Anti-Bug`
- [x] Added `scripts/anti-bug-smoke.js`
- [x] Anti-Bug now checks CRM signup provisioning gaps across:
	- `admin_users`
	- `crm_user_settings`
	- `user_compartments`
	- `tenants`
	- `crm_tenants`
	- `tenant_setup`
- [x] Added `scripts/verify-crm-signup-provisioning.js` for per-user verification after signup
- [x] Added `scripts/repair-crm-signup-provisioning.js` for safe legacy-data repair (supports dry-run)

### New-Tenant SaaS / QR Provisioning

- [x] Updated `app/api/crm-site/signup/route.ts` to auto-create `crm_user_settings` for new tenants
- [x] Signup now assigns a new 7-digit `permanentTenantId` during account creation
- [x] Signup now generates and stores `qrBridgeSecret` during account creation
- [x] Signup now creates a starter `user_compartments` record so onboarding/setup-status has a real compartment to work with
- [x] Signup now seeds `crm_tenants` and `tenant_setup` records for CRM-site onboarding flows
- [x] Updated `app/crm-site/signup/page.tsx` so free-plan signup lands on `/admin/crm/qr`

### Legacy Tenant Cleanup

- [x] Audited all non-Super-Admin CRM tenant users with `scripts/audit-crm-signup-provisioning.js`
- [x] Repaired legacy provisioning gaps for existing CRM users using `scripts/repair-crm-signup-provisioning.js`
- [x] Re-ran audit and confirmed `users with gaps: 0`
- [x] Verified repaired users including `test2@swaryoga.com` and `demo@swaryoga.com`

---

## Work Still Needed

These are the remaining tasks to fully reach the final target.

### Priority 1 — Must Be Confirmed for Every User

- [ ] Verify every active CRM user can scan QR successfully
- [ ] Verify every active CRM user sees the scanned number in the header
- [ ] Verify header format is clear and consistent, e.g. `Connected · +91 0000000000`
- [ ] Verify users never see another user's chats after fresh scan / refresh / reconnect
- [ ] Verify old chats from previous scans do not reappear in current tenant inbox
- [ ] Verify chat count shown in UI matches real session-scoped chat count

### Priority 2 — Keep Data Fresh and Correct

- [ ] Verify chat list updates correctly after new inbound messages
- [ ] Verify message pane updates correctly after outbound send
- [ ] Verify reconnect / refresh does not restore stale bridge history
- [ ] Verify saved connected number changes correctly when a user scans a different WhatsApp account
- [ ] Verify session isolation still holds after logout/login and browser refresh

### Priority 3 — Product / UX Polish

- [x] Make QR-first onboarding flow explicit for all new CRM users
- [x] Ensure all new users get QR metadata automatically at onboarding:
	- `crm_user_settings`
	- `permanentTenantId`
	- `qrBridgeSecret`
- [ ] Make the header badge wording final and consistent across all states
- [ ] Add a small user-facing fallback message when live bridge status is delayed but saved sender exists

### Priority 4 — Monitoring / Regression Safety

- [ ] Deploy Anti-Bug Center to production
- [ ] Run Anti-Bug smoke test after deploy
- [ ] Run signup provisioning verification for a fresh new tenant after deploy
- [x] Run legacy provisioning repair for any old CRM user surfaced by Anti-Bug or verification scripts
- [ ] Add post-deploy QR regression checklist for:
	- header sender visible
	- no cross-user chats
	- chat count sane
	- QR page no runtime crash
- [ ] Re-run these checks after every QR bridge or QR UI change

---

## Exact Acceptance Criteria

The QR WhatsApp system is only considered **fully done** when all of the following are true:

- [ ] User scans QR and connection succeeds
- [ ] Header shows scanned sender number clearly
- [ ] Header number remains visible after refresh
- [ ] Only current user's chats are visible
- [ ] No old chat history leaks from another user or previous scanned account
- [ ] Chat count matches actual session
- [ ] New inbound/outbound messages appear correctly
- [ ] No QR page runtime crash occurs
- [ ] Anti-Bug dashboard shows healthy/warning state correctly

---

## Recommended Execution Order

1. **Deploy current Anti-Bug work**
2. **Verify scanning + header sender for all test users**
3. **Verify privacy isolation user-by-user**
4. **Verify chat freshness / counts**
5. **Lock final header wording and onboarding flow**
6. **Use Anti-Bug page + smoke test after every deploy**

---

## What Is Done vs Not Done Yet

### Done

- Anti-Bug center built locally
- privacy protections improved
- session-scoped QR storage preferred
- scanned-number recovery logic added
- CRM-site login now redirects users to `/admin/crm/qr` first locally
- CRM-site signup now provisions tenant QR/SaaS records and redirects free-plan users to `/admin/crm/qr`
- legacy CRM tenant provisioning gaps were repaired and re-audited to zero
- build passing locally

### Not fully done yet

- full production deployment verification of Anti-Bug center
- per-user acceptance testing for all CRM users
- final proof that no cross-user history appears in every edge case
- final proof that header sender appears for every user consistently

---

## Notes for Future Sessions

- Trust server-side QR privacy filtering, not frontend filtering
- Prefer session-scoped Mongo QR chat storage over bloated bridge history where possible
- Header sender should always use multiple fallbacks:
	1. live bridge status
	2. saved `qrConnectedPhoneNumber`
	3. settings recovery path
- Any QR change should be re-tested for:
	- privacy
	- sender header
	- chat count
	- runtime crash

