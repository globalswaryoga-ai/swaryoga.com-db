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

### Deployment Command:
```bash
# 1. Sync code to Contabo
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' . root@169.58.238.255:/var/www/swaryoga/

# 2. Build and reload PM2
ssh root@169.58.238.255 "cd /var/www/swaryoga && npm run build && pm2 reload swaryoga"
```

---

## 2. Database & Storage Rules
- **Bunny Storage / BunnyDB**:
  - Always prioritize **Bunny Storage & Bunny Database** over MongoDB for CRM data, leads, workshop schedules, and content.
  - Bunny Edge database reflects updates immediately across the cloud.
