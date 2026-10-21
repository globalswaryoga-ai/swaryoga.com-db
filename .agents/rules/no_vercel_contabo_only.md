---
description: Critical rule forbidding Vercel usage and enforcing Contabo VPS deployment and hosting only.
---

# Strictly Use Contabo VPS - Never Use Vercel

### MANDATORY DEPLOYMENT & HOSTING RULE
1. **NEVER USE VERCEL**:
   - Do NOT run `vercel`, `vercel --prod`, or any Vercel deployment commands.
   - Do NOT route domains, traffic, or builds through Vercel.
   - Vercel is strictly deprecated and disabled for this project.

2. **HOSTING & DEPLOYMENT TARGET: CONTABO VPS ONLY**:
   - **Contabo Server IP:** `169.58.238.255`
   - **User:** `root`
   - **Path on server:** `/var/www/swaryoga`
   - **Process Manager:** `pm2` (process name: `swaryoga`, id: 1)
   - **Web Server / Reverse Proxy:** `caddy` (Caddyfile at `/etc/caddy/Caddyfile`)
   - **Domains pointed to Contabo:** `swaryoga.com`, `www.swaryoga.com`, `crm.swaryoga.com`, `wa-bridge.swaryoga.com`.

3. **HOW DEPLOYMENTS TO CONTABO ARE EXECUTED**:
   - Sync files from the workspace to the Contabo server:
     ```bash
     rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' . root@169.58.238.255:/var/www/swaryoga/
     ```
   - On the server, run build and restart PM2:
     ```bash
     ssh root@169.58.238.255 "cd /var/www/swaryoga && npm run build && pm2 reload swaryoga"
     ```
