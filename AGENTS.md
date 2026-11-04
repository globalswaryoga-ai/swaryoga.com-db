# Repository Guidelines & Operational Rules

## 1. Hosting & Deployment Rules (CRITICAL)
- **DO NOT USE VERCEL**:
  - Never run `vercel`, `vercel --prod`, or any Vercel deployment commands.
  - Vercel is strictly disabled.
- **USE CONTABO VPS ONLY**:
  - **Server IP:** `169.58.238.255`
  - **User:** `root`
  - **Project Directory:** `/var/www/swaryoga`
  - **App Process:** `pm2 reload swaryoga` (Next.js running on port 3000)
  - **Web Proxy & SSL:** Caddy (`systemctl reload caddy`)
  - **Live Domains:** `swaryoga.com`, `www.swaryoga.com`, `crm.swaryoga.com`, `wa-bridge.swaryoga.com`

### Zero-Downtime Atomic Deployment Command (Vercel-Style Blue/Green):
```bash
# 1. Sync code to Contabo VPS
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude '.next_staging' --exclude '.next_snapshots' . root@169.58.238.255:/var/www/swaryoga/

# 2. Run Atomic Zero-Downtime Build & Health Check Script
ssh root@169.58.238.255 "/var/www/swaryoga/scripts/deploy-atomic.sh"
```
> **How Atomic Deployment Works**:
> 1. Next.js builds into an isolated staging folder (`.next_staging`).
> 2. The live site continues serving from current `.next` with **ZERO downtime** (no 502 / no chunk load errors).
> 3. If compilation fails, the live site is untouched.
> 4. On success, it archives a snapshot to `.next_snapshots/` for instant 1-second rollback (`/var/www/swaryoga/scripts/rollback.sh`).
> 5. Performs an instant atomic swap (`mv`) and graceful PM2 reload.

---

## 2. Database & Storage Rules (STRICT: BUNNY ONLY)
- **STRICTLY BUNNY ONLY — NO MONGODB**:
  - We are using **ONLY Bunny Database (Bunny Edge SQL) and Bunny Storage**.
  - **MongoDB is completely decommissioned and MUST NOT be used anywhere**.
  - Do NOT connect to MongoDB or Atlas.
  - Do NOT import or execute Mongoose models for active features.
  - All CRM data, leads, workshop schedules, attendance, recordings, user accounts, authentication, QR WhatsApp data, and content MUST use **Bunny Database (`lib/bunnyDatabase.ts`)** and **Bunny Storage (`lib/bunnyStorage.ts`)**.
  - Always ensure environment has `USE_BUNNY_DATABASE_ONLY=true` and `DISABLE_MONGODB=true`.

---

## 3. Contabo VPS Build & Memory Rules
- **Memory Allocation for Builds**:
  - Always build with `NODE_OPTIONS="--max-old-space-size=6144"`.
  - Next.js production builds will crash with Out Of Memory (code 134) on Contabo without this flag.
```bash
# Correct Contabo build & reload command:
ssh root@169.58.238.255 "cd /var/www/swaryoga && NODE_OPTIONS='--max-old-space-size=6144' npm run build && pm2 reload swaryoga"
```

---

## 4. Video-to-Transcript, Spell Checker & Grammar Engine Rules (CRITICAL: VERBATIM FIDELITY)

### 1. Strict Word-for-Word Verbatim Audio-to-Transcript:
- When converting Mohan Sir's lecture videos/audio to text transcripts, the system must capture **EXACTLY what was spoken word-for-word**.
- **NEVER substitute, paraphrase, "formalize", or replace spoken vocabulary**:
  - ❌ **STRICTLY FORBIDDEN**: Replacing spoken Marathi words like `डावी नाकपुडी व उजवी नाकपुडी` with `डावी छिद्र व उजवी छिन्द्र` (this distorts the yogic and anatomical meaning completely).
  - ✅ **MANDATORY**: Preserve `डावी नाकपुडी`, `उजवी नाकपुडी`, `स्वर`, `नाडी`, `श्वास`, etc. exactly as spoken.

### 2. Spell Checker Scope (Orthography & Matras Only):
- The spell checker is strictly limited to fixing spelling mistakes, matras (वेलांटी, उकार, काना, मात्रा, अनुस्वार), halanta, and conjunct characters of the **exact same word**.
- The spell checker must **NEVER replace a word with a synonym or alternative noun**.

### 3. Grammar Checker Scope:
#### A. Marathi & Hindi (Mohan Sir's Native Tongues — Verbs Only):
- The user (Mohan Sir) knows Marathi and Hindi intimately and spoke these lectures.
- The grammar checker is permitted to adjust **ONLY VERBS (क्रियापद / Kriyapad)** to fix subject-object-verb gender, number, and tense agreement.
- **NEVER alter Objects (कर्म / Karma), Nouns (नाम / Noun), or Sentence Structure**:
  - Example: `मी मोहन ला आंबा दिली` ➔ The grammar error is solely in the verb `दिली`.
  - Corrected: `मी मोहन ला आंबा दिला` (only verb `दिली` changed to `दिला` to agree with masculine object `आंबा`).
  - The object `आंबा`, the recipient `मोहन ला`, and sentence structure must remain 100% untouched.

#### B. English & All Other Global Languages (Hometown Sentence Naturalization):
- For English and all other languages (Japanese, Spanish, French, German, Italian, Russian, etc.), Mohan Sir does not speak with hometown native colloquial idioms.
- The system must check and adapt **BOTH the VERBS AND the FULL SENTENCE STRUCTURE**.
- The sentence structure is converted into the native hometown way of that target language (natural, fluent native phrasing), **WHILE preserving the exact same meaning, educational depth, and humor/punchlines**.
- Sacred yogic nouns (`Swar Yoga`, `Ida Nadi`, `Pingala Nadi`, `Sushumna Nadi`, `Prana`, `Chakras`) remain 100% intact.


