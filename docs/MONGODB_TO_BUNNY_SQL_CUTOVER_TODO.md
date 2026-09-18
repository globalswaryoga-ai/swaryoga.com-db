# MongoDB → Bunny SQL Cutover Todo

**Status:** Active migration — target is Bunny SQL + Bunny Storage only. MongoDB remains temporary read-only safety storage until each module has schema, repository, parity, and rollback validation.
**Last audited:** 2026-09-18

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
