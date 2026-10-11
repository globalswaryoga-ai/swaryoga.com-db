# MongoDB → Bunny SQL Cutover Todo

**Status:** Active migration — target is Bunny SQL + Bunny Storage only. MongoDB remains temporary read-only safety storage until each module has schema, repository, parity, and rollback validation.
**Last audited:** 2026-09-18

## Registration repair clarification

### Durable autosave and saved Meta recovery — October 11, 2026

Registration batch edits, My Data lists, category names/order and valid question
rules now save automatically with serialized version checks. Failed edits remain
pending for Retry rather than being forgotten. Sidebar position/width and collapsed
sections are stored with the registration settings. Mount/hydration does not upload
browser defaults. Wait for the saved indicator before closing; unsaved/in-flight
registration changes warn before leaving.

Unversioned batch/category/rule writes from older deployed tabs return an explicit
409. Whole-list autosave cannot replace an existing batch's form/AI metadata, even
when it has the latest list version; those settings use the batch-settings endpoint.
Removing a batch requires the confirmed Delete/Merge path. Source lead records,
form responses and decision history are not deleted by these operations.

Meta stage drafts autosave valid edits without starting processing. Start/run and
WhatsApp activation remain explicit. Historical settings may survive in a selected
batch snapshot after an older whole-list write loses its metadata; recovery must
match the exact batch ID, preserve the live form mapping, and obtain authorization
before restoring active automation switches. Never invent missing rules or resend
messages just to repair counters.

Workshop Offer has independent transactional version checks for settings, record
corrections and draft payments/designs. Offer-scoped response corrections/removals
are overlays, not source-record deletion. Final documents, financial finalization,
deletions and delivery still require explicit confirmation.

Workshop Students, cohort settings and recording-link drafts also use debounced,
serialized saves with visible Retry and flush-on-close behavior. Conflicting edits
are rejected instead of replacing another saved version. Existing enrollment
removals and recording delivery actions remain deliberate.

Form-column migrations now verify the schema again after a concurrent ALTER
failure. A column created by another serverless instance is accepted only when
actually present; a missing column still fails visibly. This addresses the observed
registration cron `duplicate column name: lead_id` error without resetting forms.

### Chatbot and workshop recording access — October 11, 2026

Chatbot flow CRUD now treats Bunny SQL as authoritative. SQL failures are explicit;
the shared Storage JSON file is no longer a silent fallback or concurrent write
target. Tenants author only their own flows; Super Admin edits preserve the
original flow owner. Automation rules are stored in `chatbot_automation_rules_sql`;
preserved `whatsapp_automation_rules` documents are imported once from the Bunny
archive without contacting MongoDB. Deleting an imported rule does not restore it.

Workshop Edit contains an opt-in recording access policy in
`metadata.recordingAccess`: `enabled`, `maxDays` (3–5), `minimumMinutes`,
`keywords`, and `templateId`. Both attendance delivery and keyword/button requests
share `workshop_recording_access_sql`, keyed by cohort/student/class date. Missing
attendance is not absence; verified absence or duration strictly below the selected
minutes is eligible. Sunday/holidays do not count as class sessions. Automatic
delivery scans prior dates, queues at most 25 recipients per run, and continues on
subsequent cron runs. Previously delivered recordings are not resent.

Recording delivery uses an owned approved Meta template with one body variable
`{{1}}` for saved Speaker/Gallery links. The existing broadcast worker rechecks
enrollment, ownership, policy and attendance before sending, and uses the immutable
queued links rather than template variable names. Queued/reserved distinct dates
consume allowance while delivery is pending; retries reuse the same date/event.
Uncertain provider acceptance requires reconciliation, never blind resending.
No group broadcast is used for individual student eligibility.

The account chatbot master switch and AI fallback remain opt-in. Welcome repeat
days `0` means first conversation only; positive days configure an inbound
conversation cooldown, not unsolicited proactive messaging. Template-button
payloads and interactive IDs/titles are preserved for trigger matching. AI uses
server-configured credentials and must not override recording eligibility.
Multiple active workshop matches require administrator selection. Explicit
`recording YYYY-MM-DD` selects a date; “yesterday” is literal in workshop timezone,
while a request without a date selects the last prior class session.

Live chatbot execution, state, send intent, delays and deferred-event replay use
Bunny SQL only. Distinct incoming messages received while a conversation is
locked remain deferred for provider retry or the minute cron. Accepted/uncertain
sends remain guarded and are not retried automatically. Cancelling a flow clears
canonical state and cancels pending owned actions, without erasing provider evidence.
Office hours gate normal flows and AI, including overnight ranges; recording
requests remain independently controlled by workshop policy.

Supported canvas nodes are message/question/buttons/template/delay/wait_reply/end.
Legacy advanced nodes remain preserved as disabled drafts and are rejected before
flow start rather than partially executing. The palette exposes supported nodes
only. Proactive inactivity/escalation jobs and advanced canvas integrations remain
follow-up work; their existing settings are not proof of runtime support.

The minute chatbot-actions cron requires `CRON_SECRET`; a Vercel User-Agent is not
authentication. Recording delivery also requires the existing broadcast cron;
recording availability still depends on the external upload worker. Configuring
templates, enabling settings, deployment and a consented live-send acceptance test
remain separate from local implementation. No paid AI or live send is used in tests.

### Permanent contact ingestion and recipient mapping — October 11, 2026

Google response persistence, CRM submission persistence, Meta lead ingestion and
lead saves immediately resolve normalized email/WhatsApp identities in Bunny SQL.
`lead_contact_identities_sql` uniquely claims identities within an ownership scope;
shared Super Admin sources share a scope and tenant sources remain isolated.
Permanent IDs and sequence-backed lead numbers survive retries and later phone
enrichment. The user chose automatic email/phone conflict merging: old rows remain
as aliases and historical IDs resolve to the survivor. No raw response is deleted.

Submissions retain their own response identity and `lead_id`. Broadcast and AI
Triggers load saved batch-specific decisions from the server, map contacts before
queue creation and deduplicate full international phones. Invalid/blocked numbers,
unapproved templates and stale categories cannot produce an empty successful run.
Legacy duplicates are reconciled as those contacts are imported/saved again; this
does not claim that every historical contact has already been reconciled.
Live deployment, the Google OAuth reconnect and the user's saved approval-stage
configuration remain separate prerequisites for unattended end-to-end operation.

### Google Forms registration import recovery — October 11, 2026

The registration data section reads saved Bunny SQL records; refreshing that
section alone does not fetch new Google responses. The Google connection panel
therefore provides an explicit **Import from Google** action, while the scheduled
Google Forms cron continues to import forms in the background. Imports compare
Google response IDs with saved submissions and process only missing or
incompletely linked responses, so earlier saved responses cannot consume the
whole run before newer responses are reached. Per-form sync status records the
response total, saved total, last run/success and recent error for diagnosis.

CRM submissions and Google responses are both displayed for a selected form when
their saved `form_id` matches that form. Public website workshop registrations
can now be generated from Form Links Manager with an explicit active CRM
registration form selected. In the registration setup panel, a form can be saved
to an explicitly selected batch or to the language master list when opened from
All Leads without a selected batch. This avoids blocking form setup after the
batch selection is cleared on that tab. The public link's form ID is validated
and saved with the lead-linked CRM submission, so it appears with Google
responses in the selected form's Data section. Links without a selected form
continue to save ordinary CRM leads only; no association is guessed from a
workshop name or language.

All Leads Data and Meta Trigger share the same batch-scoped Name, Email and
Mobile/WhatsApp field mapping, including CRM answers nested under
`dynamicAnswers.dynamicAnswers`. Trigger preview distinguishes no saved batch
responses from responses without eligible unique WhatsApp numbers. Invalid,
blocked and duplicate numbers remain excluded.

The audience API returns a recipient-only projection (mapped identity, phone,
category membership, ownership and display filters) rather than duplicating raw
answers and decision/workshop history for every batch. Full source records remain
in Bunny and server scheduling reloads them for validation. This keeps the saved
audience response below the serverless response-size limit for the audited data.

### Future Meta approval-only trigger — October 11, 2026

AI-9 Start now saves the edited configuration and immediately runs the saved
active stage rules through the authenticated Bunny batch processor. Already
active configurations offer **Run Saved Rules** for an explicit retry. The UI
reports checked/moved counts and errors, including when no eligible stage
changes exist. Processing uses the full owned batch, not the currently loaded
browser candidate list. AI-9C handles stage-2 new/pending leads; it does not
bypass inactive earlier stages or reclassify finalized/rejected leads.
Scheduled processing remains responsible for future leads. This immediate-run
correction is local pending deployment; activating classification does not
override the separate future-only WhatsApp approval gate described below.

Workshop settings use three-way merging against the client's previous snapshot:
unchanged fields retain current Bunny values, and unrelated batch/other-stage
updates no longer block saving. An AI-stage configuration remains one atomic
field, so competing changes to the same rule set require reload rather than
silent overwrite. SQL list compare-and-swap and removed-batch checks remain.

The user chose to keep all four AI-9 approval stages and configure their rules,
not substitute the single recoverable question. Automatic WhatsApp now requires
saved active AI-9A–D rules, proof that each stage passed, a valid saved batch/form,
an approved owned template, AI-9E enabled and an explicit future-only activation.
AI-9W stays inactive until configuration is complete. Pending/rejected/blocked
leads and manually marked Approved leads do not bypass screening.

Workshop saves update one batch with compare-and-swap protection rather than
replace a stale full list. The server stamps the first activation time; subsequent
saves preserve it. Reload resolves the canonical batch, not malformed or obsolete
selected-workshop snapshots. Meta Instant Forms, leadgen, inbox leadgen and manual
sync share Bunny event/contact persistence; replays preserve status, creation time,
ownership and delivery evidence. Failed webhook persistence returns an error for
Meta to retry. The separate legacy leadgen broadcast-list enrollment was removed
so it cannot bypass the approval-only path.

Old pre-activation leads are excluded. Existing provider-accepted bulk recipients
for the same owner/template are preserved and never resent by this activation.
Deterministic queue identity survives repeated/concurrent workers and template
ID/name history is checked consistently. Manual AI processing uses saved server
rules, not browser-submitted status results.

**Remaining acceptance:** select/connect the real batch, configure/start AI-9A–D,
then save AI-9W. Deploy these local changes and verify production `CRON_SECRET`;
registration processing is scheduled every five minutes and broadcast sends
every minute without requiring an open browser. The connection panel warns when
the cron secret is absent. A consented new test contact must pass the saved rules
and yield one provider message ID before advertising spend is increased.
No old lead deletion, live send or production configuration mutation was performed.

### Google response counts and OAuth connection — October 11, 2026

Google response-ID inserts/answer updates/count refreshes now commit atomically.
Ten replayed syncs and concurrent retries are covered by local SQL tests.
The registration language pages and Workshop Offer replace a form's saved
snapshot rather than only appending unseen IDs. Genuine separate responses from
the same contact remain separate; mirrored CRM contact rows are not extra responses.

Google Forms has one OAuth configuration across authorization, callback,
listing, sync and authenticated private-sheet access:

- Set both `GOOGLE_FORMS_CLIENT_ID` and `GOOGLE_FORMS_CLIENT_SECRET` to the same
  Google Cloud OAuth client. If neither is set, a complete existing
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` pair remains a compatibility option.
  A partial dedicated pair is rejected, not mixed with YouTube credentials.
- Register `https://swaryoga.com/api/admin/google-form-oauth/callback`,
  `https://crm.swaryoga.com/api/admin/google-form-oauth/callback` and, for local
  testing, `http://localhost:3000/api/admin/google-form-oauth/callback` on that
  client. The browser's current origin chooses its callback.
- `GOOGLE_FORMS_REDIRECT_URI` is optional and must be a same-origin Forms
  callback. The YouTube `GOOGLE_OAUTH_REDIRECT_URI` is not used.
- Reconnect Google once after changing the client and approve offline Forms,
  Drive and spreadsheet read access. Credentials save encrypted to canonical
  Bunny SQL accounts, scoped to the authenticated owner; saved leads and form
  selections are unchanged. No success is reported if credential persistence fails.

**Remaining live acceptance (October 11, 2026):** preserved connections return
`unauthorized_client` / `invalid_grant`. A fresh production reconnect was also
verified to fail with Google's `redirect_uri_mismatch` for
`https://swaryoga.com/api/admin/google-form-oauth/callback`. The local general
client ID/secret are configured and the client matches production; absence of
the optional dedicated Forms pair is not itself an error. The currently
signed-in Google Cloud account lacks access to the client project. Its owner
must add the callback under Google Auth Platform → Clients → the configured
web client → Authorized redirect URIs, save, then reconnect from CRM and approve
offline access. Verify an authenticated form listing and persisted Bunny
connection before reporting success; do not replace credentials or alter saved
responses merely to hide this error.

Some legacy imports use
different identities from newer official responses, and several saved form IDs
have no current form definition. Reconnect and compare the complete Google
response-ID set before deciding which uncertain older imports represent copies.
No older rows were physically deleted and exact live Google/Bunny parity is not
certified yet.

### Preserve-first registration persistence — October 11, 2026

The registration language pages and Workshop Offer no longer resend every
cached browser key. Initial hydration and newly restored batch fields do not
write defaults; subsequent saves contain changed visible fields only. Client
saves are serialized, and Bunny checks the previous persisted values inside a
write transaction before committing the entire patch. A stale-tab conflict
rolls back and reports reload guidance. Old broad-autosave clients are rejected
until refreshed. This is application-level protection, not a Playwright/network
interception dependency.

Canonical SQL objects/arrays refresh browser cache alongside string values.
Saving Meta stage rules does not rewrite form-screen defaults; OAuth success
does not clear an existing form connection. Saved source leads/responses,
manual gates and batch settings remain stored independently of browser sessions
and deployments. Explicit edits and enabled scheduled automation can still
change their respective data; the deployment itself does not reset it.

Regression coverage includes SQL reopening, stale snapshot rollback, unchanged
mounts, restored batch fields, independent updates, and Stage 2/3 saves. The
read-only pre-deployment baseline contains 5,841 lead rows, 925 form responses
and 5 forms; exact identity hashes are retained privately for post-deploy
verification. Missing historical settings are not invented from incomplete
browser snapshots.

Production release `ca06c797` is verified Ready as deployment
`dpl_AsXvftzPWY7698ora2fqzb2ZccHE` on both CRM/website domains. Post-deploy
identity checks retain all 5,841 original leads plus one newly arrived live
lead, all 925 responses and all 5 forms. Normal browser refresh after removing
temporary test interception retained 53 Hindi batches without semantic changes
to workshop/configuration/decision state. One raw Hindi workshop hash changed
during live activity, so byte-for-byte pre/post settings equality is not claimed.

### Meta trigger evidence and report lifecycle — October 11, 2026

Current Meta status buckets reconcile all 56 audited leads. Cumulative stage
views overlap. Trigger cards/report counts require recipient rows with actual
WhatsApp provider IDs; historical `wtStatus` flags alone are unverified evidence.
Do not resend the 40 historical flagged contacts merely because verified count
is zero.

Retry excludes accepted/sent and wrong-number recipients. Reschedule/cancel only
affect unsent recipients, and in-flight sends block report actions. Frontend
Delete archives a run with `reportFolder: deleted`, cancelling its pending
recipients without erasing run/message history. Archived verified evidence
continues to contribute to lifetime totals. Provider acceptance survives a
later inbox persistence failure so retry cannot duplicate that message.

Saved questions no longer disappear from AI-9 selectors and saves cannot
silently succeed for an absent batch. The screenshot's Meta batch remains
absent from persisted workshop state; restore its real configuration before
certifying new-lead automatic WhatsApp delivery.

### Workshop Offer repair — October 11, 2026

Offer-specific settings, payments, native studio drafts/final PDFs and Canva
connections use Bunny SQL/Storage. Offer reads use permanently saved Google/CRM
responses; the existing Google cron also discovers saved offer batch links.
Legacy server payment entries are retained as drafts requiring admin verification.
No live MongoDB connection is introduced by these offer endpoints.

The CRM studio replaces the unsupported full Canva-editor iframe. It provides
editable multilingual text, brand colors, fonts, sizes, PNG export and persisted
PDFs. Canva OAuth is optional and requires matching redirect origin, configured
credentials, encryption key and user consent. Existing cookie-only connections
need reconnecting once. Canva exports are imported into Bunny before completion.
AI image/video jobs require configured Replicate credits; AI copy uses the
existing provider fallback. Videos currently export as saved background clips,
not composited text-overlay final advertisements.

The legacy Meta AI route now recognizes "create one image", requires CRM admin
authentication and reports generation/persistence failures explicitly. Its chat
payload is bounded and contains no base64 attachments. It does not support
reference-photo editing: attached references are rejected before paid provider
calls rather than silently ignored. Current generation uses Replicate FLUX,
not ChatGPT image editing; funded text-model access alone does not establish
reference-image generation support.

Admin must confirm amount/date/mode, review certificate participation eligibility,
finalize the document, then approve a native document-template Meta delivery.
Duplicate clicks reuse a deterministic Bunny broadcast run; reports show actual
worker outcomes. `CRON_SECRET`, an approved document template, tenant Meta
credentials and a canonical CRM contact are prerequisites. Meta delivery is not
WhatsApp-group delivery; the existing group scheduler remains separate.

Remaining acceptance: migration of offer browser-only funnel workers, durable
spreadsheet imports, unattended approved document rendering, video compositing,
live OAuth/generation/delivery tests, financial reconciliation and deployment.

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

Leads Management now groups answer rules under one question: answers to the
same question are alternatives; different required questions must all qualify.
A configured Pending answer takes priority over approval on another question.
Blank/unlisted answers retain the current category unless a review destination
is selected. Duplicate answer mappings with conflicting destinations are
rejected on save. Settings retain the existing per-batch/per-worker Bunny keys.
Submit closes after the confirmed save, while the server batch run reports
progress separately; no success is shown before persistence. All Batch Leads is
the complete preserved audience; category copies/history can overlap, and the
current-status summary distinguishes unprocessed, pending and approval counts.

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

### Registration funnel stage counts — October 11, 2026

Pending/approval funnel-stage tabs include each lead's current saved stage and
explicit `copies` memberships; a copied lead may therefore appear in multiple
stages, while history alone does not keep it visible in an earlier stage.
Manual Copy adds a destination without changing status. Manual Move changes the
status and removes the source-stage copy membership while retaining audit history
and unrelated copies. The AI worker's per-stage Copy Ahead / Move Only setting
uses the same membership rules.

The Meta Trigger category selector is populated from the saved registration
category list, including categories added or renamed in Leads Management.
Schedules store stable category IDs, and recipient matching honors current
status or explicit copy membership; historical decision records alone do not
add recipients.

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
