# MongoDB → Bunny SQL Cutover Todo

**Status:** Active migration — target is Bunny SQL + Bunny Storage only. MongoDB remains temporary read-only safety storage until each module has schema, repository, parity, and rollback validation.
**Last audited:** 2026-09-18

## Registration repair clarification

The current registration repair targets **Bunny Database only**. Its state,
Google/CRM saved-data reads, Meta trigger queue/report/retry routes, Zoom booking
storage, and public form submission/contact/ID/question routes do not connect to
MongoDB. The preserved `mongo_documents` table is a Bunny SQL archive, not a live
MongoDB fallback.

Local mocked registration/Google ingestion regressions pass. Production
deployment and authenticated acceptance are still pending; this does not certify
all unrelated website routes as Mongo-free. The public website schedule API and
its legacy schedule editor still require separate Bunny cutover/seat-inventory
reconciliation before scheduled public workshop intake can be certified.

### Registration automation audit — October 11, 2026

The intended chain is Meta lead -> configured screening -> Meta template ->
Google form -> saved registration data -> configured funnel -> Meta follow-up ->
Zoom meeting -> final approval -> WhatsApp group admission.

- [x] Local configuration persistence fixes: per-batch/per-worker Bunny keys,
  confirmed saves, authoritative restoration, no category deletion on page open.
- [x] 17 regressions pass, including a local SQL database closed and reopened
  with the same saved questions, answers, and copy settings.
- [x] Local Meta queue gate honors AI-9E enablement and its configured filters.
- [ ] Deploy and verify the new registration SQL state/queue and booking paths.
  Read-only checks found none of these new state/booking tables in the connected
  Bunny database; the production state endpoint still returns legacy saved state.
- [ ] Verify production cron authorization and execution. The tagged local
  environment has no `CRON_SECRET`; production environment was not inspected.
- [ ] Migrate/re-save the existing active monthly schedule with canonical lead
  IDs. Its production state lacks a saved `leadIds` audience.
- [x] Move configured AI-4A–P processing to the server registration cron and
  replace its browser mutating timer with read-only decision polling. One form
  per language/batch is required; re-save each batch's rules to opt into server
  execution. Legacy global rules are not automatically enabled for every batch.
- [x] Apply the user's clarified scrutiny semantics: every configured required
  answer must pass before approval; age ranges come from saved rules. The
  existing AI-4A configuration still needs a success destination before it can
  advance leads.
- [ ] Move legacy AI-1/AI-1A, AI-2/AI-3/AI-5 browser timers and their hardcoded
  education/profession/age checks into reviewed server-side processing.
- [x] Keep separate manual gates: Meeting Done or audited Skip Zoom is required
  for Final Approve. Group Added (Manual) records an admission already performed
  externally; Skip Group records an explicit override. Neither button adds a
  WhatsApp member. Gates save to Bunny with viewer/time and stale-write checks.
- [ ] Define consent, bridge/group permissions, and privacy fallback before
  enabling an actual final-approval-to-group-add automation.
- [ ] Perform consented end-to-end acceptance with a test contact, verifying
  receipts, form identity, funnel transitions, Zoom completion, and group outcome.

### Registration page-speed validation — October 11, 2026

- Read-only browser resource timings measured the deployed Hindi page shell at
  approximately 1.56 seconds. Existing Google sync, Meta sync, and Meta data
  requests recorded approximately 40–42 seconds; production has not been
  redeployed with the worktree repairs.
- Unused tab code is dynamically loaded across English/Hindi/Marathi/Kannada.
  All Leads Data, Meta Leads, and Leads Management render at most 50 rows per
  page while retaining every filtered row for navigation, bulk selection, and
  exports. No database result limit was introduced.
- Contact matching uses one phone/email index instead of one full contact scan
  per submission. Tests preserve earliest phone-or-email match behavior and
  verify linear contact reads on 5,000 leads/700 responses.
- A local 5,000-lead/727-response benchmark measured ~989 ms for scanning versus
  ~5 ms for indexed assembly. Whole-page/network improvements must be measured
  after deployment; this benchmark does not certify production latency.
- Meta stale fetches are cancelled, simultaneous syncs are blocked, hidden-tab
  polling is suppressed, decision polling loads only the selected batch, and
  concurrent form-table initialization shares one request.
- Final focused validation: 46 tests pass across eight suites, including
  pagination navigation/reset, exact first-match identity, linear contact reads,
  single-flight schema initialization/retry, SQL close/reopen persistence,
  server scrutiny replay, gate ownership and stale-save rejection.
  TypeScript reports no matching registration/Google/forms diagnostics;
  repository-wide pre-existing TypeScript errors remain outside this repair.

### Registration UI and Meta broadcast verification — October 11, 2026

- The repaired Meta-only health API uses tenant credentials from Bunny SQL and
  app-secret proof, without waiting for QR bridge health. A read-only account
  probe returned HTTP 200, GREEN quality, and approximately 1,315 ms. The old
  deployed combined health check incorrectly reported a missing-proof error.
- Template header media now uploads once per cached account/media identity,
  including simultaneous requests. The cache is bounded and expires after one
  hour; failed uploads retry on later calls. Header preparation is outside send
  retries, and media/send requests have explicit timeouts.
- Meta Leads and Leads Management use the shared Bunny broadcast run/message
  queue. Scheduled form audiences retain both response IDs and canonical CRM
  IDs; category eligibility is checked against the saved batch decision before
  queueing. Exact template metadata and sender ownership scope duplicate checks.
- Scheduling no longer fetches the legacy Mongo-backed WhatsApp groups route.
  The supported automatic delivery channel here is Meta, not QR/group messaging.
  Zoom/group admission remain the separate manual gates described above.
- Meta lead sync reads Bunny contacts once, preserves tenant ownership and
  existing screening stages, skips unchanged responses, and gives new leads the
  `new` state so AI-9A can screen them. Its Google Contacts side effect also reads
  Bunny's preserved SQL archive; it does not connect to MongoDB.
- UI changes include responsive sidebars, visible workflow steps, Meta quality
  and latency status, batch-only schedule lists, and protected schedule editing.
  Browser-trigger cache no longer displays another session's saved schedules.
- Validation: 73 tests pass across 14 suites; `git diff --check` passes. Modified
  files have no TypeScript diagnostics; full type-check still fails on unrelated
  baseline errors. A read-only Bunny check took ~889 ms and found 52 completed
  Meta runs. These aggregate counts do not certify the new registration pipeline.
- Deployment, canonical batch-rule/schedule re-save, production cron/schema
  verification, and consented end-to-end delivery/form/gate acceptance remain
  required. Local repairs do not establish deployed speed or delivery results.

### Saved form connection follow-up — October 11, 2026

- Restored the existing registration CRM-form dropdown. A form imported from
  Google is selectable as a saved CRM form; the chosen form ID and source remain
  in the batch's Bunny settings until explicitly saved differently.
- Connection save confirmation, data refresh, and navigation wait for database
  success. Tests cover failed/delayed saves and preservation of old selections.
- All four registration language pages load saved Bunny rows scoped to the
  selected form. Legacy AI browser polling also reads Bunny; it does not call
  Google response import. Explicit manual sync is retained in Form Questions.
- The existing ten-minute server worker now also discovers language workshop/
  offer links saved in `global_crm_config.google_form_links`. Registered forms
  and existing batch mappings remain supported. Invalid optional links produce
  explicit partial-error reports without suppressing existing valid targets.
- Form Questions Auto-Sync saves its connection for that worker; the interval
  display is fixed to the existing ten-minute schedule, not a false configurable
  interval. Production deployment and `CRON_SECRET`/cron verification are still
  required before certifying automatic intake.
- Validation: 81 tests pass across 17 suites, including actual local SQL
  close/reopen persistence of form choice and unchanged approval gates. No
  scoped TypeScript/editor errors; unrelated baseline errors remain. No live
  production import or connection setting was changed.

## Live progress dashboard

- Admin view: `/admin/crm/database-migration`
- The dashboard refreshes automatically every 15 seconds.
- It is read-only and reports verified work only; it does not mark incomplete modules as finished.
- The progress percentage is task-based, not a claim that MongoDB can already be removed.

## No-MongoDB completion rules

- [ ] No production API route calls `connectDB`, `mongoose`, or `MongoClient`.
- [ ] No production library imports MongoDB schemas or uses Mongo-specific collections.
- [ ] All old data has a Bunny SQL row or Bunny Storage object, with source/target reconciliation reports.
- [ ] All writes, updates, deletes, retries, quotas, and tenant filters are transaction-safe in Bunny SQL.
- [ ] Public and admin acceptance tests pass while MongoDB is unavailable.
- [ ] MongoDB environment variables, packages, cron jobs, and runtime fallbacks are removed only after the above checks pass.

## Completed and verified

- [x] Bunny SQL client exists in `lib/bunnyDatabase.ts`.
- [x] Archive migrations `0001` through `0014` exist for selected CRM data.
- [x] Workshop management has a Bunny SQL repository and SQL-backed API routes.
- [x] Workshop repository now maps SQL snake_case fields to the camelCase application contract.
- [x] Workshop attendance cron no longer requires a MongoDB connection.
- [x] Bunny SQL variables are documented in environment templates.
- [x] Admin CRM login now reads bcrypt hashes from Bunny SQL instead of MongoDB; archived admin accounts were seeded into `admin_users_sql`.
- [x] QR bridge session resolution and connected-phone persistence now use Bunny SQL; the Hetzner bridge remains the WhatsApp transport.
- [x] Community Zoom Settings mappings and the community picker now read/write Bunny SQL; four archived mappings were imported.
- [x] Zoom Management recording ledger now reads/writes Bunny SQL instead of MongoDB.
- [x] Community Moderation read APIs now load archived pending submissions from Bunny SQL and the page has a ten-second request timeout.
- [x] CRM analytics overview and Super Admin dashboard metrics now read Bunny SQL/archive data instead of requiring MongoDB Atlas.
- [x] Daily export now snapshots Bunny SQL directly to Bunny Storage under `/sql/latest` and `/sql/history`; it no longer requires MongoDB Atlas.
- [x] Main Leads list and metadata reads now use `leads_sql` through `lib/bunnyLeadsRepository.ts`, preserving tenant filters, search, pagination, and the existing response shape.
- [x] CRM settings GET/PUT and QR auto-provision now use Bunny SQL; tenant-owner session lookup uses the archived Bunny tenant table.

## Immediate blockers

- [ ] Run and record the numbered SQL migrations in Bunny SQL with a real schema-version table and checksums.
- [ ] Reconcile workshop data: cohorts, students, attendance, recordings, and delivery history. Current recorded state is one cohort, zero students, zero attendance rows, and one recording delivery.
- [ ] Remove `lib/workshopStudentLeadSync.ts` Mongo dependency by creating a Bunny SQL lead repository for lookup, update, and allocation.
- [ ] Add a repeatable workshop import/reconciliation script; do not rely on manual restoration.
- [ ] Verify all workshop API routes return structured errors for Bunny connection/configuration failures.
- [ ] Align `0015_workshop_management.sql` with runtime schema initialization and add safe indexes/relationship checks without destroying existing rows.

## Cutover order

### Phase 1 — CRM identity and tenant foundation

- [x] Create Bunny repositories for `crm_user_settings` and read migrated `crm_tenants` records.
- [ ] Create Bunny repositories for `tenant_setup` and `user_compartments`.
- [x] Move CRM settings GET/PUT and QR auto-provision to Bunny SQL.
- [ ] Move QR session reconciliation, auth-state lookup, and contamination cleanup to Bunny SQL.
- [ ] Move authentication/session lookups and tenant access to SQL only after dual-read parity checks.
- [ ] Extend Bunny-backed analytics beyond the overview view: sales, conversion, trends, and message-level reporting need typed SQL tables.
- [ ] Migrate regular website users to a dedicated Bunny SQL users table; the public `/api/auth/login` route still uses MongoDB.
- [ ] Preserve password/token security boundaries; never copy secrets into logs or client responses.

### Phase 2 — Leads and CRM activity

- [x] Create the first typed Bunny SQL leads repository and cut over GET list/metadata reads.
- [ ] Add normalized email/phone indexes and complete parity tests for all lead filters.
- [ ] Migrate lead create/update/delete, assignment, numbering, duplicate checks, followups, notes, and receipts.
- [ ] Add source-vs-target count, identity, and deletion reconciliation reports.

### Phase 3 — Messaging and WhatsApp

- [ ] Create repositories for templates, quick replies, broadcast lists/members/runs, schedules, and delivery state.
- [x] Add Bunny SQL QR chat/message/archive metadata schema and repository foundation (`migrations/0019_qr_whatsapp_sql.sql`, `lib/bunnyQrRepository.ts`).
- [ ] Run `scripts/migrate-qr-whatsapp-to-bunny.mjs` and reconcile source/target counts before changing QR runtime reads.
- [x] Add Bunny SQL Meta message/webhook schema and repository foundation (`migrations/0020_meta_whatsapp_sql.sql`, `lib/bunnyMetaWhatsAppRepository.ts`).
- [x] Meta inbound webhook writes and Meta inbox/message reads prefer Bunny SQL when Bunny records are available.
- [ ] Run `scripts/migrate-meta-whatsapp-to-bunny.mjs` and reconcile historical Meta messages before changing Meta runtime reads.
- [ ] Move Meta account ownership lookup and lead association out of MongoDB before declaring the Meta webhook Mongo-free.
- [x] Add Bunny-first Meta account ownership/credential repository (`migrations/0021_whatsapp_accounts_sql.sql`, `lib/bunnyWhatsAppAccounts.ts`).
- [ ] Run `scripts/migrate-whatsapp-accounts-to-bunny.mjs` and reconcile account ownership before removing the fallback.
- [x] Apply and checksum migrations `0019`, `0020`, and `0021` in Bunny SQL; existing ledger format is `name + checksum`.
- [ ] Import historical QR/Meta messages and account rows after a readable legacy export/source is available.
- [x] Restore preserved QR/Meta records from the Bunny `mongo_documents` archive without MongoDB: 85,650 QR messages, 24,373 QR chats, 5,527 QR archive manifests, and 11 Meta messages.
- [ ] Import Meta account rows when a preserved account export becomes available; the current archive contains zero `whatsapp_accounts` documents.
- [x] Restore Meta archive manifests into Bunny SQL: 2,646 manifest rows covering 1,165 phone conversations, so archived chats are discoverable in the inbox.
- [x] Restore preserved Community data into Bunny SQL: 435 members, 22 videos, 10 posts, 22 watch logs, 2 experiences, and 1 question.
- [ ] Move Community moderation mutations and remaining e-learning data/runtime paths to Bunny SQL.
- [ ] Move QR chat/message snapshots, queue, lead ownership checks, and archive processors from MongoDB to Bunny SQL.
- [ ] Move webhooks, inbox reads, sends, schedulers, and cron processors to SQL transactions.
- [ ] Validate tenant isolation, deduplication, unread counts, receipts, media references, and retry behavior.

### Phase 4 — SaaS, forms, workflows, and billing

- [ ] Move CRM signup, team users, plan access, onboarding, workflows, email campaigns/events, form submissions, and API keys.
- [ ] Add SQL constraints and transactional quota/seat/lead reservations.
- [ ] Reconcile billing/payment and CRM receipt data before disabling Mongo writes.

### Phase 5 — Website, community, e-learning, Sadhana, accounting

- [ ] Inventory and model remaining website users, courses, enrollments, community, Sadhana, accounting, Tally, and planner data.
- [ ] Migrate one bounded module at a time with application-level parity tests.
- [ ] Keep media/video bytes in Bunny Storage/Stream; keep relational metadata in Bunny SQL.
- [ ] Add Bunny SQL mutation tables for moderation submissions so approve/reject/answer actions no longer require MongoDB.

### Zoom and workshop recording pipeline

- [x] Download Zoom MP4 recordings and upload them to Bunny Stream through `lib/zoom-s3-sync.ts`.
- [ ] Add the YouTube upload result to the same Bunny SQL recording ledger; the existing scheduled uploader currently owns YouTube delivery.
- [ ] Replace the legacy Mongo community-video link path with a Bunny SQL community-video repository.
- [ ] When a recording is mapped to a Bunny workshop cohort, upsert Speaker/Gallery Bunny and YouTube links into `workshop_recordings_sql`.
- [ ] Run the workshop student worker only after recording delivery links are present and verify duplicate-safe student delivery.
- [x] Verified Bunny Zoom state: 4 community mappings and 1 workshop recording delivery with Speaker/Gallery YouTube and Bunny URLs.
- [ ] Populate the Zoom recording-sync ledger when additional preserved uploader records become available; current Bunny ledger is empty.

### Phase 6 — Decommission and operations

- [ ] Add SQL health checks, migration status, backup/restore, and failure alerts.
- [ ] Run a documented dual-read period and compare production reads/writes.
- [ ] Disable Mongo writes only after rollback snapshots and acceptance tests pass.
- [ ] Retain MongoDB as a read-only emergency archive for the agreed retention period, then remove runtime connection requirements.
- [ ] Configure a strong `CRON_SECRET` in local/production environments so the SQL-to-Storage daily snapshot cron can run securely.

## Rules for every module

1. Define SQL schema and indexes before changing runtime reads/writes.
2. Add a repository; routes must not issue ad-hoc SQL.
3. Import existing data with a resumable script and source/target reconciliation.
4. Test tenant filtering, duplicate handling, updates, deletes, and retries.
5. Cut over reads first, then writes, then remove Mongo fallback only after validation.
6. Record the exact migration, validation output, and rollback plan in the change log.
