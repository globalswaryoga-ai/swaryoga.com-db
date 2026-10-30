# Mohan RAG — Existing Project Assessment

**Date:** 2026-10-30  
**Scope:** First implementation assessment for the Mohan RAG and AI Avatar work.  
**Data rule:** Bunny Database and Bunny Storage only for this feature. Do not use MongoDB, Atlas, or a separate storage provider.

## A. Existing project architecture

- The product is a Next.js App Router application. Admin UI lives under `app/admin/crm`; server endpoints live under `app/api`.
- The CRM shell supplies the global navigation, auth-aware pages, and section tabs. Mohan RAG has a hub and a large Avatar Studio.
- Bunny Database is accessed through `lib/bunnyDatabase.ts` and `@libsql/client`. Bunny Storage is accessed through `lib/bunny-storage.ts`.
- AI provider calls are kept in server-side helpers and route handlers. Existing providers include OpenAI/Anthropic text generation, OpenAI Whisper, HeyGen, and Replicate-backed media services.
- The repo includes both old MongoDB infrastructure and Bunny-only migrations. The local `.env.local` has `USE_BUNNY_DATABASE_ONLY=true` and `DISABLE_MONGODB=true`; the new Mohan RAG routes directly use Bunny Database.

## B. Existing technology stack

- Next.js 14 App Router, React 19, TypeScript 5, Tailwind CSS 3, and `lucide-react`.
- Bunny Edge SQL through `@libsql/client` and Bunny Storage through authenticated HTTP APIs.
- Existing media dependencies include client-side FFmpeg, PDF parsing packages, and video-processing services.
- Existing AI providers include OpenAI and Anthropic text generation, OpenAI Whisper transcription, HeyGen avatar rendering, and Replicate media generation. Feature availability depends on server environment configuration.
- Local and production development use npm scripts; the repository deployment rule is the Contabo atomic deployment process with Vercel disabled.

## C. Existing features and reusable components

- Mohan RAG hub: `app/admin/crm/mohan-rag/page.tsx`.
- Avatar Studio: `app/admin/crm/mohan-rag/avatar-studio/page.tsx`.
- Existing FAQ article manager: `app/admin/crm/knowledge-base/page.tsx`, with Bunny-backed route/repository. It is structured FAQ content, not the requested six-module corpus.
- Existing RAG Video page includes transcription correction/review, media conversion, RAG settings, and related production views under `app/admin/crm/e-learning/rag-video/`.
- Existing recorded-course answer route retrieves course notes and materials through Bunny course repositories and `lib/ragRetrieval.ts`.
- Existing Mohan clone repositories under `lib/mohanAiClone/` store media, transcripts, jobs, appearance presets, and video projects in Bunny Database.
- New work added a Mohan RAG admin workspace, module text-source repository, approval flow, lexical answer preview, and explicit avatar connection record.

## D. Existing MP4-to-MP3 converter

- `Mp4ToMp3Converter.tsx` uses `lib/clientAudioCompressor.ts` and browser-side FFmpeg to convert media into small speech MP3s.
- It supports local upload and a media URL route. The UI describes a 16 kHz mono speech target and compresses for the existing 24 MB Whisper limit.
- It returns the converted file to its caller; it does not provide a long-term original-media repository, resumable Bunny upload, or background job queue.

## E. Existing MP3-to-text converter

- Audio transcription is implemented in `lib/aiVideo/transcribeAndCondense.ts` and the AI Video jobs routes.
- Stage 1 uses OpenAI Whisper (`whisper-1`) and rejects audio above 24 MB. Stage 2 uses OpenAI/Anthropic text generation to correct transcription errors without adding or translating content.
- These routes run synchronously for the source size they currently support. They are not a safe full-corpus processor for 3–4 TB of recordings; they need a Bunny-backed job/asset layer and chunked/resumable processing before bulk use.
- The correction checkpoint is a useful workflow to preserve. The current schema should be extended to maintain original and corrected transcript versions linked to the source asset.

## F. Existing avatar and voice generation

- The Avatar Studio contains a large visual configuration UI and stores several preferences in browser `localStorage`.
- Its current “Set & Save as Active Master Avatar” handler only sets a temporary success state; it does not persist the selected clone or provider IDs for use by another service. Some preview/test controls are local UI behavior and must not be represented as production video rendering.
- Avatar reference videos can be saved through `/api/admin/crm/mohan-rag/avatar-vault` to Bunny Storage and Bunny Database.
- `lib/aiVideo/heygen.ts` supports submitting and checking avatar video jobs using provider avatar and voice IDs. `HEYGEN_API_KEY` is required.
- `SwarNeuralVideoService` and the existing e-learning video renderer provide other avatar pipelines, but their defaults include preset OpenAI voices and a fixed face asset; those defaults are not equivalent to a verified cloned voice.
- The new Mohan RAG integration stores a separately confirmed provider avatar ID, voice ID, avatar type, and authorization flag in Bunny Database. It uses HeyGen on an explicit admin action and stores completed video in Bunny Storage. It does not guess clone IDs.

## G. Missing features

- Separate document/audio/video uploads for each module; safe extraction, original/transcript retention, source preview, bulk/resumable upload, background workers, retries, and large-file lifecycle.
- A research job pipeline with source verification, evidence assessment, citations, draft editing, and manual approval.
- Semantic embeddings and reranking. The current Mohan RAG prototype uses lexical overlap over Bunny SQL chunks.
- Module-specific instruction persistence/versioning and full approval audit history.
- Student identity, course-level access enforcement, student Q&A UI, answer history, and feedback.
- Data-backed operational analytics, usage/cost accounting, backups/retention controls, and full security/performance verification.
- The complete A–Q technical inventory for unrelated project subsystems has not been performed; this document covers Mohan RAG dependencies only.

## H. Recommended database structure

Use Bunny Database tables with parameterized SQL and module filters enforced in server handlers:

- `mohan_rag_sources_sql`: module, title, content or storage key, topic, language, source type/reference, processing state, approval state, reviewer, and version timestamps.
- `mohan_rag_chunks_sql`: source ID, module ID, chunk index/content, language, topic, and future embedding representation if a Bunny-compatible implementation is selected.
- `mohan_rag_answer_jobs_sql`: question, module/language, answer, citations, context-sufficiency, render state, provider job ID, Bunny video URL, and timestamps.
- `mohan_rag_avatar_config_sql`: explicit authorized provider avatar/voice IDs, avatar type, label, authorization confirmation, editor, and update time. Never store provider API keys here.
- Future separate tables for research runs/sources/reports, upload/processing jobs, instruction versions, student access, and audit events.

The current slice has created the source/chunk, answer, and avatar-config tables lazily through Bunny Database. It does not create any MongoDB collection.

## I. Recommended storage architecture for 3–4 TB recordings

- Keep original files in Bunny Storage. Store object keys, checksums, size, MIME type, and source metadata in Bunny Database.
- Upload directly/resumably to storage through an authenticated streaming or multipart path. Do not route multi-gigabyte files through `request.formData()` or buffer entire recordings in Node memory.
- Process media asynchronously. Keep extracted audio, original transcript, corrected transcript, chunks, and embeddings as separately versioned derivatives linked back to the original.
- Reuse the existing converter/transcription stages for small media only after the background job interface is introduced. Never send an entire video or multi-hour transcript to an LLM in one request.
- Do not move originals or introduce R2/S3/MongoDB as part of this work.

## J. API architecture

Implemented admin APIs for the first slice:

- `GET/POST /api/admin/crm/mohan-rag/knowledge` — list module sources or create a draft text source.
- `GET/PATCH/DELETE /api/admin/crm/mohan-rag/knowledge/[id]` — inspect, edit-to-draft, approve/reject, or delete a source and chunks.
- `POST /api/admin/crm/mohan-rag/search` — retrieve approved lexical chunks within module/level constraints, generate a draft answer, and persist citations.
- `GET/PUT /api/admin/crm/mohan-rag/avatar-connection` — read/save confirmed provider IDs; API credentials remain server-side.
- `GET/POST /api/admin/crm/mohan-rag/answer/[id]` — poll answer render or explicitly submit it to HeyGen; copy the completed video into Bunny Storage.

Future APIs should use admin/super-admin authorization for administration, student-level authorization for learner endpoints, strict input/file limits, rate limits, and auditable job transitions.

## K. Six knowledge module architecture

Maintain independent content scopes for:

1. WHY SWAR YOGA? — motivation only; no practical HOW.
2. LEVEL 1 — Level 1 only.
3. LEVEL 2 — Level 1 + Level 2.
4. LEVEL 3 — Level 1 + Level 2 + Level 3.
5. GENERAL TOPICS — approved general education, separated from Swar Yoga claims.
6. RESEARCH & SEARCH ENGINE — separate research reports and sources; approval required before retrieval.

All knowledge libraries support text entry and PDF, DOCX, MP3, and MP4 import. PDFs and DOCX files are text-extracted; MP3/MP4 speech is transcribed; originals go to Bunny Storage and extracted text/chunks are saved to Bunny Database as drafts. Admins can inspect extracted text and original files. Research retains its separate citation-required editor and approval workflow. Automated research discovery, evidence grading, scanned-PDF OCR, and background/resumable jobs remain unimplemented.

## L. RAG retrieval and permission architecture

- Current admin preview: query-term overlap ranking against approved Bunny SQL chunks; retrieved module IDs are selected by the requested module/level; response generation uses the existing server-side AI fallback.
- WHY, General, and Research remain isolated. Level 2 inherits Level 1; Level 3 inherits Level 1 and Level 2. Only approved chunks are eligible.
- Answers return source IDs, module, topic, and source reference. No matching approved chunk yields an insufficient-context response.
- Limits: keyword retrieval has no embeddings/reranker and is not production-grade for broad multilingual semantic retrieval. Admin preview is not a student authorization boundary; do not expose it to learners without a student-level gate.

## M. Research Engine architecture

Implemented manual path: topic intake and cited report entry → distinct science/tradition/hypothesis sections → admin edit/approve/reject → approved-only retrieval in the Research module. A citation is required when saving or approving a research report. Automated source discovery, citation verification, evidence grading, research-run jobs, and budget limits remain planned; reports are never auto-approved.

## N. Avatar video generation architecture

Current Mohan RAG handoff: approved-source answer draft with citations → explicit admin render click → confirmed HeyGen avatar/voice IDs and server key → HeyGen job polling → completed media copied to Bunny Storage → Bunny URL and citations retained on the answer record. Missing provider IDs/API credentials produce a clear setup error. The result is an admin answer preview flow; student-facing generation, billing controls, provider language verification, and operational testing remain pending.

## O. Development roadmap with dependencies

1. **Admin shell and text corpus** (implemented): navigation, separate work areas, Bunny source/chunk CRUD, manual approval.
2. **Grounded admin preview** (implemented as keyword MVP): approved-only retrieval, module boundaries, citations, insufficient-context behavior.
3. **Authorized clone handoff** (implemented behind explicit configuration): provider IDs, render request, poll, Bunny delivery.
4. **Upload and processing**: validate Bunny streaming/resumable path and worker deployment, then connect supported documents and media without buffering large files.
5. **Research**: manual cited-report entry and approval are implemented; automated source discovery/validation remains planned.
6. **Semantic retrieval and student access**: select a Bunny-only embedding approach, enforce course/level permissions, and validate isolation.
7. **Analytics and production readiness**: event metrics, costs, retention, backup, security/performance verification; deploy only through Contabo atomic process.

## P. Infrastructure and AI cost categories

Expected cost drivers: Bunny Storage capacity/CDN/operations; Bunny Database usage; transcription minutes; text generation tokens; research/search requests; HeyGen video minutes/credits; media worker CPU/RAM; backups and monitoring. No numerical estimate is reliable until file volume, processing rate, traffic, video duration, provider plans, and retention are measured.

## Q. Security and scalability risks

- Keep all administrative RAG endpoints super-admin-only until learner permissions exist. Current API key remains server-side; avatar/voice provider IDs are not secrets but still require owner authorization.
- Treat source text and retrieved excerpts as untrusted data; source contents can include prompt injection. The answer prompt explicitly ignores embedded instructions but still needs evaluation and output review.
- Never retrieve draft/rejected knowledge. Keep module and learner-level filters server-side; UI filters alone are insufficient.
- Current source text is capped at 180,000 characters and 100 chunks per source. Uploaded originals are capped at 150 MB; Whisper audio payloads at 24 MB after browser-side MP4 conversion/compression. Scanned-PDF OCR, resumable upload, and asynchronous workers remain future work.
- Bunny SQL lexical retrieval may become slow or inaccurate as the corpus grows. Add indexes and bounded candidate sets; evaluate Bunny-compatible embeddings before adopting semantic search.
- Generated video polling and provider calls can cost money and take time; require explicit admin action, job idempotency, rate limits, usage caps, and retry controls before learner release.
- Existing Avatar Studio previews are not a substitute for verifying actual provider avatar/voice IDs. Never infer identity or use a default face/voice for the owner's clone.
- Existing repo-wide MongoDB code remains outside this feature audit. The new Mohan RAG paths do not call it; keep the two local DB-only flags enabled and do not add new MongoDB dependencies.

## Verification status

No automated tests or production deployment were run as part of this implementation. Runtime integration with Bunny services, configured AI providers, HeyGen IDs/credentials, and Bunny Storage still needs authorized environment-level verification.
