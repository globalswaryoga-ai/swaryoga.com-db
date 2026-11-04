# Mohan RAG Management — Approval TODO

**Status:** Approved to proceed. The management workspace supports Bunny-backed text sources and original-file import (PDF, DOCX, MP3, MP4), extraction/transcription drafts, library previews, keyword answer preview, manual cited research drafts, an explicit avatar render connection, and a persistent overnight queue for uploads plus Bunny/YouTube video URLs. Queued media produces Whisper timestamped minute timelines with transcript-based avatar emotion/face suggestions. Completed media transcripts are separate draft sources in **Library (All Sources)**, not in the E-learning Master Teaching Corpus; review and approve them before RAG retrieval. The queue supports a manual worker trigger and retry for failed jobs. Overnight processing requires `CRON_SECRET` and triggers the worker through the authenticated local API route. Production provider/RAG runtime verification, resumable uploads, scanned-PDF OCR, automatic research discovery, semantic retrieval, and student access remain pending.

**Contabo pipeline deployment (November 4, 2026):** Bunny Stream rendition handling and facial extraction fixes are deployed in atomic build `1aUT-w4y8hZAEWK7RQcE2`. Both management URLs return HTTP 200; unauthenticated Avatar DNA/facial-expression APIs return 403; the web process is online and the retired facial worker remains stopped. Bunny-only mode and the MediaPipe/OpenCV runtime are verified. The RAG library has 39 Bunny Stream, 43 `youtube`, and 7 `mp4` rows. Although 37,158 historical facial clips contain blendshapes, none belonged to the 39 Bunny Stream sources before the smoke test. The single Bunny Stream smoke job `face_job_1793798450842_de550e` completed successfully: 966 frames sampled and 481 valid face clips persisted (771 meditative focus, 131 serene contemplation, 60 warm smiles, 2 Duchenne smiles). This verifies extraction for one source only, not a trained or certified clone. No full batch or clone-provider rendering has been verified.

**Bunny/YouTube inventory reconciliation (November 4, 2026):** A metadata-only scan of the configured Swar Yoga channel saved 166 unique video IDs to Bunny. The scan used no authorized cookies; 85 entries are labeled `subscriber_only` and 81 `unknown`, so their accessibility is not established. No video media was downloaded or transcribed. Separately, `community_videos_sql` contains 48 YouTube rows, all flagged unlisted, for 47 unique IDs; one ID appears in two lesson entries, and none overlaps the 166 channel-tab IDs. A no-cookie metadata check resolved 28 of these 47 as accessible unlisted videos from the configured channel (13 Hindi, 10 Marathi, 2 English, 3 unknown language). The other 19 were not usable in this check: 1 private/sign-in required, 12 unavailable, and 6 reported by yt-dlp as removed for being too long. The 47 count therefore exists in a separate community catalog, not in the channel scan. The RAG catalog also contains 39 Bunny Stream rows, 43 `youtube` rows (6 reference Bunny CDN URLs), and 7 `mp4` rows (5 distinct references); duplicate YouTube/MP4 references were found but not deleted. The reported 87 could be 39 Bunny Stream rows plus 48 community YouTube rows, but this crosses separate catalogs and includes a duplicate; it is not a verified list of 87 unique videos. The ingestion queue has 84 completed jobs (42 YouTube, 42 Bunny), with 42 Bunny jobs mapping to 39 unique Bunny Stream videos. No extraction batch was started.

**YouTube facial extraction smoke (November 4, 2026):** One metadata-confirmed unlisted English speaker-view video (`_27tyc20PKk`, 4,355 seconds) was submitted as the single low-rate test job `face_job_1793807839605_11e103`. The Bunny job record is `failed`, with 0 analyzed frames and 0 persisted clips. Contabo's yt-dlp was blocked by YouTube's “Sign in to confirm you're not a bot” challenge. The facial worker now supports the server-configured `YOUTUBE_COOKIES_FILE` and `YT_DLP_PATH`, validates the cookies file, passes it only through yt-dlp's `--cookies` option, and reports actionable access errors. The worker-only change was deployed in Contabo atomic build `ugkvdsOEAVURs8PoPvKqU`; the management pages returned HTTP 200 on both domains and the unauthenticated facial API returned 403. No `YOUTUBE_COOKIES_FILE` is configured on Contabo, so the failed job was not retried. Retry requires a readable authorized Netscape cookies file from an account permitted to view the video; restrictions must not be bypassed. Two different approved Bunny Stream English speaker recordings (October 22 and 26) exist, but neither is the tested October 6 source and neither was used. No batch, clone training, or provider render was started.

The Avatar DNA Facial tab now separates curated facial DNA entries from extracted facial clips. It displays paginated clip samples, expression totals, extraction job status, and missing historical job links; clips are review-only and are never automatically promoted to curated DNA. A November 2026 Bunny audit found saved facial clip data with no corresponding extraction-job rows, so the page reports those historical results as untracked rather than inventing job completion status.

Avatar DNA look entries are deduplicated by normalized video identity (including Bunny player/CDN variants and YouTube watch/short links). The library hides duplicate rows and offers an explicit cleanup action that preserves the active DNA record; adding the same video again updates its existing row.

The YouTube Channel Intake page scans the channel's `/videos` tab using yt-dlp and stores a deduplicated inventory in Bunny Database. Selected accessible videos can be queued into the existing Bunny-backed ingestion worker. Channel transcripts are saved as unapproved drafts; the worker records transcript language and an AI-assisted topic/relevance label for admin review. Failed topic screens can be retried from the inventory without downloading or transcribing the video again. This screening does not approve content or choose avatar DNA moments. Unlisted videos must be reachable through an authorized playlist/inventory; member-only videos require a configured session belonging to an account with access.

The YouTube intake and transcript-screening phase is deployed to Contabo in atomic build `nVbkV_libS29we5u-HyY_`. The management page returned HTTP 200 on both production domains, and the new unauthenticated API check returned the expected HTTP 403. No channel scan, video queue, transcript, provider call, or Bunny data write was triggered during deployment verification.

The YouTube workflow still needs human-reviewed timestamp selection, real clip cutting, curation of selected facial clips into DNA, voice/appearance DNA extraction from approved clips, and authorized clone-provider validation. Screening, queueing, transcription, or DNA library deduplication alone does not train or certify a clone.

### YouTube ingestion worker setup

- The RAG worker uses the system `yt-dlp` executable; install it on the Contabo worker and set `YT_DLP_PATH` only if it is not on `PATH`.
- The facial-expression worker also honors `YT_DLP_PATH` and the server-configured `YOUTUBE_COOKIES_FILE`. It validates readability, invokes yt-dlp with `--cookies` only when explicitly configured, and does not use browser cookies.
- If YouTube requires sign-in, export a Netscape-format `cookies.txt` from an account authorized to view those videos. Store it outside the repository with owner-only permissions (for example, `chmod 600`) and set `YOUTUBE_COOKIES_FILE` to its absolute worker path.
- Never put cookie contents in source control, logs, or chat. Cookies expire; refresh the file when YouTube rejects it. A cookie file does not grant access to videos the account cannot view.
- The ingestion route validates the configured file and reports an actionable error for YouTube's sign-in/bot-check response. Existing failed jobs are not automatically retried.
- Channel discovery uses the same server-side yt-dlp installation and optional authorized cookies file; it never accepts arbitrary URLs from the browser and does not download video media during inventory scans.

## Goal

Add a **RAG Management** button to the Mohan RAG hub header. It opens a dedicated management workspace with a persistent left sidebar for the major admin pages and a main work area that shows the selected page's controls, status, details, and actions. Keep **AI Avatar — My Clone** as its own separate section in the workspace, then connect it to the approved RAG answer flow.

The system described in the master prompt is a multi-phase product. The user approved proceeding with the plan. Implement capabilities in reviewable phases, and do not present a capability as working until its backend flow is implemented and verified.

## What exists today

- `app/admin/crm/mohan-rag/page.tsx` is the current hub. Its header links to Avatar Studio; the hub contains capability cards, including RAG, with no dedicated RAG management route.
- `app/admin/crm/mohan-rag/avatar-studio/page.tsx` is an existing, substantial avatar studio and should be inspected and reused, not replaced.
- `components/admin/crm/crmNavConfig.ts` exposes the hub and Avatar Studio as Mohan RAG sub-navigation. `components/AdminSidebar.tsx` has a Mohan RAG entry. The existing CRM layout supports module tabs; the proposed management workspace adds its own in-page sidebar.
- `app/admin/crm/e-learning/rag-video/` contains existing video/audio workflows, including `Mp4ToMp3Converter.tsx`, transcript handling, `Module5VideoToTextEmotion.tsx`, and RAG settings. Inspect their APIs and data flows before reuse.
- `lib/ragRetrieval.ts` provides chunking and keyword-overlap retrieval for recorded-course Q&A. It is not a six-module store; the existing course Q&A also has a hardcoded fallback teaching passage, which must not be reused as approved RAG source material.
- `app/admin/crm/knowledge-base/` and `/api/admin/crm/knowledge-base/` manage FAQ-style articles through a Bunny repository. Treat this as a possible integration point, not as proof that the six-module RAG pipeline exists.
- `lib/bunnyDatabase.ts` provides the Bunny Database client. The repository's operational rules require Bunny Database and Bunny Storage only, with MongoDB disabled. Preserve that rule throughout this work.
- `app/admin/crm/mohan-rag/avatar-studio/page.tsx` contains a large visual studio, but its current “Set & Save as Active Master Avatar” action only updates local UI state; it does not persist provider avatar/voice IDs for another service. The new RAG connection therefore has its own explicit Bunny-backed provider-ID settings and authorization confirmation.
- `.env.local` was inspected for only the two required database-mode flags; both are currently `true`. No secret values were printed.
- The new RAG answer preview uses approved module chunks and lexical term matching, then calls the existing AI text fallback. It does not use embeddings or a separate vector database.

## Proposed management workspace navigation

Route proposal: `/admin/crm/mohan-rag/management`.

Header action on the Mohan RAG hub: **RAG Management** → opens the workspace. The workspace header provides its title, current section, and a link back to the Mohan RAG hub.

Left sidebar and corresponding main work areas (grouped into distinct sections):

### Knowledge Management

1. **Overview** — module readiness, document counts, pending approvals, recent processing jobs, retrieval health, and clear empty/setup states. All counts come from real data; no hardcoded operational statistics.
2. **Why Swar Yoga?** — approved motivation-only knowledge, scope restrictions, course invitations, languages, and links.
3. **Level 1** — source materials, metadata, review queue, index status, and Level 1 instructions.
4. **Level 2** — Level 1 + Level 2 access policy, materials, review, index status, and instructions.
5. **Level 3** — Level 1 + 2 + 3 access policy, materials, review, index status, and instructions.
6. **General Topics** — approved general education sources, allowed/restricted topics, disclaimer, and separation from Swar Yoga claims.
7. **Research & Search Engine** — topic intake, source policy, research runs, citation/evidence review, draft reports, approve/reject, and publish-to-knowledge actions. Research is never auto-approved.
8. **Ingestion & Jobs** — upload/processing queue, original/transcript relationship, progress, retry, error details, and processing history. Large media is processed asynchronously and not loaded wholesale into RAM.
9. **Knowledge Search & Test** — module/level/language filters, query preview, retrieved sources, answer preview, citations, and permission checks.
10. **Global Instructions** — teaching style, language defaults, safety boundaries, and shared answer rules, with module-specific instructions kept separate.
### AI Avatar — My Clone

11. **AI Avatar — My Clone** — a distinct section for the user's authorized digital avatar, cloned voice, language and delivery preferences, and connection status to RAG. Link to and reuse the existing Avatar Studio for avatar/voice setup; do not duplicate its asset-management workflows.
12. **Avatar Answer Connection** — show the end-to-end path from a user question → permitted module and approved-source retrieval → validated answer with citations → selected cloned voice/avatar → generated video → Bunny Storage delivery. Expose readiness, job status, failure reason, and retry where supported. Never let avatar generation bypass RAG module/level permissions or use unapproved knowledge.

### Platform Operations

13. **Analytics** — usage, retrieval quality, unanswered questions, processing success/failure, video-generation usage, and cost categories, only where backed by collected data.
14. **Settings** — configurable ingestion, chunking, retrieval, model/provider, retention, language, access, avatar connection, and usage limits. Secrets remain server-side and are never rendered into the page.

Each sidebar item must load a real page state or explicitly show **Not implemented / Setup required**. The first UI phase may establish the navigation and informative empty states; it must not fake uploads, approvals, indexing, research, or analytics.

## TODO and approval gates

### Phase 0 — Inspect the current implementation

- [x] User approved the plan and authorized implementation to begin.
- [x] Inspect the Mohan RAG hub, relevant Avatar Studio save behavior, CRM auth/layout/navigation, FAQ knowledge-base routes/repository, and RAG-video media/transcription entry points.
- [x] Trace the initial paths for Mohan RAG, FAQ knowledge base, course RAG, and avatar workspace. The new Mohan RAG source/answer flows use Bunny Database; the required DB-only flags are enabled locally.
- [ ] Audit broader app MongoDB usage before changing unrelated modules; do not use MongoDB for this feature.
- [ ] Audit related media URLs/configuration against the Bunny-only requirement; document any existing non-Bunny references and migration needs without moving or deleting user media.
- [ ] Finish documenting current stack, reusable components, API contracts, schemas, processing limits, deployment approach, security boundaries, and unknowns.
- [ ] Choose an embedding/retrieval approach that is compatible with the Bunny-only rule and actual infrastructure. Do not add a separate database or external storage provider without explicit approval.
- [x] Create an A–Q baseline architecture assessment for the Mohan RAG/Avatar surface, with wider app-level audit limits stated explicitly.

### Phase 1 — Management workspace shell

- [x] Add the **RAG Management** header button to the Mohan RAG hub.
- [x] Add the management route and responsive left sidebar with the approved pages.
- [x] Build the consistent work-area layout with page purpose, status, details, and explicit setup states.
- [x] Integrate with current CRM authentication, layout, and navigation conventions.
- [x] Mark unbuilt feature workflows as not connected; do not use fake data or claim readiness without a real health check.
- [x] Connect the module workspace to Bunny-backed text sources and draft approval.
- [x] Connect the separate AI Avatar — My Clone section to the approved RAG answer preview through an explicit provider render request.

### Phase 2 — Six isolated knowledge modules

- [x] Define the five source-bearing module IDs, source/chunk metadata, draft/approved/rejected states, reviewer fields, and module-level access filters in Bunny Database. (Research is a separate workflow.)
- [x] Build independently scoped text-source entry/edit, chunking, list, approve/reject, and delete flows for Why, Level 1, Level 2, Level 3, and General.
- [x] Add PDF, DOCX, MP3, and MP4 imports, extracted-text review, original-file links, and draft status for each knowledge library, including Research.
- [x] Store original files in Bunny Storage and extracted text/source metadata/chunks in Bunny Database.
- [x] Reuse the existing browser audio compressor and server transcription path for MP3/MP4 imports.
- [x] Add optional sentence-level emotion and face-expression tags to MP3/MP4 transcripts, preserving the spoken wording and keeping cue tags out of avatar speech text.
- [x] Add MediaPipe facial-expression extraction from video frames, persist sampled clips in Bunny, and expose paginated review with expression totals and actual extraction job status. Extracted clips remain separate from curated DNA and are not auto-promoted; historical clips without job rows are labeled untracked. MP3 has no visual stream, so its face cues can only be performance suggestions.
- [ ] Add large/resumable uploads and OCR for scanned PDFs.
- [x] Add a Bunny Database-backed YouTube/Bunny video URL queue processed by the persistent Node server from 10 PM to 6 AM Asia/Kolkata; existing Bunny videos are transcribed in place without re-upload.
- [x] Support a worker-local authorized YouTube cookies file for videos that require sign-in, with validation and clear setup errors.
- [x] Add upload-from-device media intake that stores the original in Bunny Storage and queues the Bunny URL for processing.
- [ ] Verify overnight worker, yt-dlp, FFmpeg, transcription credentials, and queue recovery on Contabo before production use; current processing is sequential and capped at 350 MB per media item.
- [x] Replace the E-learning Module 5 hard-coded sample output with the shared real timestamped transcription and transcript-based cue workflow; label that visual facial analysis is not connected.
- [x] Require explicit review and approval before source chunks become retrievable.

### Phase 3 — Retrieval, search, and answer testing

- [x] Implement approved-content-only lexical retrieval with module, level-inheritance, language, and admin-permission filters.
- [x] Add source citations and insufficient-context behavior to admin answer previews.
- [x] Add the Knowledge Search & Test work area with answer and citation previews.
- [ ] Implement semantic embeddings/reranking within the Bunny-only architecture after the supported deployment approach is selected.
- [ ] Add student identity/level authorization before exposing this answer endpoint to learners.
- [ ] Validate isolation: WHY never teaches HOW; Level 1 cannot retrieve Level 2/3; Level 2 cannot retrieve Level 3; unapproved content is excluded.

### Phase 4 — Research workflow

- [ ] Implement configurable research runs, automated source capture, and evidence grading.
- [x] Separate established scientific findings, traditional Swar Yoga teachings, and hypotheses in manually entered report templates.
- [x] Add manual draft/edit/approve/reject workflow; never index unapproved research.
- [ ] Add automated report generation and publish-to-research workflow after source validation.
- [ ] Enforce configured source, time, language, and budget limits.

### Phase 5 — Avatar delivery integration

- [ ] Keep **AI Avatar — My Clone** as a separate workspace section, distinct from the six knowledge modules and from general RAG settings.
- [x] Add a separate Bunny-backed AI Avatar — My Clone section with authorized provider ID settings; keep secrets in server environment.
- [x] Connect a cited answer preview to an explicit HeyGen render request and Bunny Storage video delivery path.
- [x] Add approved source → E-book chapter draft generation with editable preview and Markdown download.
- [ ] Configure the user's actual HeyGen avatar ID, cloned voice ID, API key, and provider voice/language compatibility; the code does not guess IDs.
- [x] Preserve module/level boundaries, approved-source citations, language, and answer validation through the admin handoff into video generation.
- [ ] Add student identity/level authorization before exposing video generation to learners.
- [x] Add observable render status, retry-after-failure, language propagation, and Bunny Storage delivery.
- [ ] Keep live interactive avatar explicitly out of the initial release unless separately approved.

### Phase 6 — Student experience, analytics, and production readiness

- [ ] Implement student identity, course-level permissions, multilingual question interface, video answer/history, and feedback.
- [ ] Add data-backed operational, quality, and usage metrics.
- [ ] Verify access controls, data retention, deletion, audit logs, backup/restore, processing limits, and cost controls.
- [ ] Perform functional, security, isolation, citation, and performance verification before production deployment.
- [ ] Deploy only through the approved Contabo atomic deployment process; never use Vercel.

## Implementation status

- [x] The proposed route and sidebar pages match the user's intended admin workflow.
- [x] The header button opens RAG Management and each sidebar entry has a defined work area.
- [ ] Finish remaining A–Q baseline findings, resumable uploads/OCR, automatic research discovery, semantic retrieval, student access, and data-backed analytics.
- [x] New Mohan RAG source, answer, clone-connection, and generated-video records use Bunny Database and Bunny Storage. MongoDB is not used by these new flows.

## Review notes

Add requested page changes or scope decisions here before approving Phase 0/Phase 1:

- **Approved:** ☑ Yes ☐ No
- **Changes requested:**
- **Priority modules for the first usable release:**
- **Anything to exclude from the first release:**
