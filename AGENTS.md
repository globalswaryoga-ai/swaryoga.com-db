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

