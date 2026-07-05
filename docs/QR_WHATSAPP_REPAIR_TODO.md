# QR WhatsApp Repair Plan

**Created:** June 30, 2026
**Scope:** QR WhatsApp inbox, scheduling, presence, delivery/read receipts, and reports
**Workflow:** Implementation is approved. Production deployment/restart and live-message acceptance remain separately approval-gated.

**Scale target:** Tenant/session-isolated operation for 1,000 tenants, with O(1) session resolution, bounded cron concurrency, and no cross-tenant fallback.

## Status Key

- `[ ]` Not started
- `[~]` In progress
- `[x]` Verified complete
- `[!]` Blocked or failed

## Baseline Findings

- [x] July 5 restart audit: MongoDB auth reads worked, but `saveCreds` was empty and the bridge tried to read nonexistent `sock.authState`; paired credentials were therefore not persisted for restart recovery.

- [x] July 5 scanner audit: a closed/logged-out session retained a stale socket, while the UI waited for `qrAvailable` before requesting `/qr`; together these prevented QR regeneration.
- [x] July 5 linking audit: repeated `/qr` polling could replace an already-connecting socket, causing WhatsApp to reject device linking. Active connecting sockets are now left intact to refresh their own QR.
- [x] July 5 inbox audit: the persistent messages endpoint uses the standard `{ success, data }` response wrapper, but the inbox read only the top-level `messages`, hiding MongoDB inbound/outbound history.
- [x] July 5 inbound audit: modern `@lid` messages were validated as phone numbers and discarded, then persisted under a rewritten JID that did not match the selected inbox thread.

- [x] The normal inbox send flow calls the bridge proxy directly. It does not use the persistence-aware QR send endpoint, so outbound history and later receipt/report matching depend on a bridge webhook event that is not guaranteed to be ingested.
- [x] The direct-message scheduler submits `targetLeadIds: []`, while the API requires at least one lead ID. The request is rejected before a schedule is created.
- [x] The general scheduler sends through the Meta Cloud API functions and has no QR provider/session routing.
- [x] Presence is polled without first subscribing to the selected contact's presence events. Its first poll also waits ten seconds.
- [x] QR message status is intended to use `-1=failed, 0=pending, 1=sent, 2=delivered, 3=read`, but the inbox tick component interprets raw Baileys `0..5` values. This prevents correct double-grey and blue ticks.
- [x] QR webhook ingestion still stores a new outbound QR message as status `2` even though status `2` now means delivered, not sent.
- [x] Report updates require a persistent message row keyed by the real WhatsApp message ID. Missing outbound rows therefore break ticks and reports together.
- [x] Targeted baseline tests: 60 passed and 3 failed. The three failures are existing QR UI expectation mismatches outside the messaging paths under repair; new tests will isolate every repair below.

## Approval-Gated Work Items

### 1. Inbound and Outbound Message Reliability

- [x] Make every successful inbox send persist the real WhatsApp message ID, session owner, connected phone, chat JID, direction, and initial sent status.
- [x] Ensure bridge-originated inbound and outbound events are deduplicated by tenant/session/message ID.
- [x] Preserve correct group JIDs and participant information during ingestion.
- [x] Add normalization, payload, status, and session-isolation regression coverage.
- [~] Verify a sent message appears once and survives bridge-memory restart (requires deployed live bridge).
- [x] Unwrap persistent message API responses in the inbox so saved inbound and outbound messages render after refresh/restart.
- [x] Preserve `@lid` chat identity while using the bridge-resolved sender phone for lead validation and CRM matching.

### 0. QR Scanner and Session Recovery

- [x] Clear stale socket references when a Baileys connection closes.
- [x] Treat `/qr` as an explicit reconnect request after logout/disconnect.
- [x] Request `/qr` while disconnected instead of waiting for the bridge to advertise an already-generated QR.
- [x] Do not restart an active connecting socket during QR polling.
- [x] Persist the live Baileys credential object on every `creds.update` and flush once when pairing opens.
- [ ] After deployment, scan once, restart PM2, and confirm the same session reconnects without a new QR.
- [ ] Verify QR scan and phone pairing on the deployed bridge.

**Acceptance:** A real inbound message appears in the correct chat; a CRM outbound message reaches the recipient, appears exactly once, and remains available from MongoDB.

### 2. Scheduled Direct Messages

- [x] Add an explicit QR provider and direct-phone target to scheduled jobs.
- [x] Validate and normalize the target phone/JID at creation time.
- [x] Route due QR jobs through the correct tenant session instead of Meta Cloud API.
- [x] Persist the real WhatsApp message ID and failure reason.
- [x] Fix list/filter/delete behavior for a selected chat.
- [x] Add atomic execution leases and recurrence end-date handling.

**Acceptance:** A direct QR message can be scheduled from a chat, is sent once at the due time through that user's QR session, and shows its final status.

### 3. Scheduled Group Messages

- [x] Verify group schedules retain full `@g.us` JIDs.
- [x] Resolve the owner session using the permanent session key/tenant ID without listing all sessions.
- [x] Correct timezone, time-window, date, carry-over, pause/resume, and recurrence handling.
- [x] Persist per-group send results using the real WhatsApp message ID.
- [x] Add time/date regression tests, atomic schedule leases, and bounded multi-tenant concurrency.

**Acceptance:** A selected group receives one message in the configured IST window; disconnected jobs pause safely and resume without duplicates.

### 4. Online/Offline Presence

- [x] Subscribe to presence when an individual chat is selected.
- [x] Poll immediately, then at the normal interval.
- [x] Clear stale presence when changing chats or disconnecting.
- [x] Resolve phone/LID/legacy JID aliases and map online, typing, recording, offline, and last-seen states.
- [~] Verify live presence events after bridge deployment.

**Acceptance:** A selected user's online/offline/typing state updates without a page reload and never carries over to another chat.

### 5. Single Tick, Double Tick, Blue Tick, and Read Receipts

- [x] Use one canonical persisted status scale across bridge webhook, MongoDB APIs, inbox, history, and reports.
- [x] Render pending, sent, delivered, read/played, and failed distinctly.
- [x] Never downgrade status when receipts arrive out of order.
- [x] Store `deliveredAt` and `readAt` consistently.
- [x] Add exhaustive canonical status mapping and tick-rendering tests.

**Acceptance:** Sent shows one grey tick, delivered shows two grey ticks, read shows two blue ticks, failed shows an error state, and refresh preserves the state.

### 6. Reports and Live Updates

- [x] Recompute single-send and broadcast totals after delivery/read updates.
- [x] Add inbound, sent, delivered, read, failed, pending, and blocked filters/counts.
- [x] Ensure date boundaries use the intended IST reporting period.
- [x] Persist direct, scheduled, group, and broadcast records into the report source.
- [x] Refresh reports silently every 15 seconds while visible.

**Acceptance:** Report totals and recipient rows change after receipts arrive and match the inbox/history state.

### 7. Regression and Production Acceptance

- [x] Run focused QR tests and type-check affected files (124 QR/WhatsApp tests passed; zero affected TypeScript errors).
- [ ] Run the steps in `docs/QR_WHATSAPP_ACCEPTANCE_PLAYBOOK.md` for one approved test account.
- [ ] Record bridge/webhook/cron evidence without exposing secrets or message content.
- [ ] Request explicit approval before committing, deploying, restarting the production bridge, or running a real scheduled-send test.

**Acceptance:** All automated checks pass, the approved live test passes, and no tenant/session data crosses boundaries.

## Approval Log

| Work item | Approval | Result |
|---|---|---|
| Plan and order | Approved June 30, 2026 | Complete |
| 1. Inbound/outbound | Approved | Implemented; live acceptance pending |
| 2. Direct scheduling | Approved | Implemented; live acceptance pending |
| 3. Group scheduling | Approved | Implemented; live acceptance pending |
| 4. Presence | Approved | Implemented; live acceptance pending |
| 5. Ticks/read receipts | Approved | Implemented and unit verified |
| 6. Reports | Approved | Implemented and unit verified |
| 7. Production acceptance | Awaiting deployment approval | Not run against production |
