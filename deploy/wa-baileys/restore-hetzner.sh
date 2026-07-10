#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-shot restore of the WhatsApp QR bridge on a fresh Hetzner Ubuntu server.
#
# Run ON THE SERVER as root:
#   1. Copy the deploy/wa-baileys folder to the server first, e.g. from your Mac:
#        scp -r deploy/wa-baileys root@5.223.65.159:/opt/
#   2. Then on the server:
#        cd /opt/wa-baileys && bash restore-hetzner.sh
#
# What it does:
#   - installs Node 20, pm2, and Caddy (auto-HTTPS reverse proxy)
#   - installs bridge dependencies and writes the env file
#   - starts the bridge under pm2 (auto-restart + start on boot)
#   - configures Caddy to serve https://wa-bridge.swaryoga.com → localhost:3333
#
# After it finishes: every tenant must re-scan their QR code (WhatsApp
# sessions lived on the old server's disk and are gone).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="wa-bridge.swaryoga.com"
APP_DIR="/opt/wa-baileys"

if [ "$(id -u)" -ne 0 ]; then echo "Run as root"; exit 1; fi
cd "$APP_DIR"

echo "── 1/6 Installing Node 20 ──"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "── 2/6 Installing pm2 + Caddy ──"
npm install -g pm2 >/dev/null
if ! command -v caddy >/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

echo "── 3/6 Installing bridge dependencies ──"
npm ci --omit=dev || npm install --omit=dev

echo "── 4/6 Writing environment file ──"
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" <<'ENVEOF'
# ── FILL THESE IN (values live in Vercel env / your .env.local) ──
BRIDGE_SECRET=CHANGE_ME_MATCHES_WHATSAPP_BRIDGE_SECRET_ON_VERCEL
WEBHOOK_URL=https://swaryoga.com
MONGODB_URI=CHANGE_ME
MONGODB_CRM_DB_NAME=swaryoga_admin_crm
PORT=3333
NODE_ENV=production
ENVEOF
  echo "⚠️  Wrote $APP_DIR/.env with PLACEHOLDERS — edit it now, then re-run this script."
  exit 1
fi
if grep -q CHANGE_ME "$APP_DIR/.env"; then
  echo "⚠️  $APP_DIR/.env still has CHANGE_ME placeholders — edit it, then re-run."
  exit 1
fi

echo "── 5/6 Starting bridge under pm2 ──"
# ecosystem.config.js reads the app dir; pm2 loads .env via node --env-file
pm2 delete wa-bridge >/dev/null 2>&1 || true
pm2 start index.js --name wa-bridge --node-args="--env-file=$APP_DIR/.env" --max-memory-restart 500M
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "── 6/6 Configuring Caddy (auto-HTTPS) ──"
cat > /etc/caddy/Caddyfile <<CADDYEOF
$DOMAIN {
    reverse_proxy localhost:3333
}
CADDYEOF
systemctl enable caddy
systemctl restart caddy

sleep 3
echo "── Verification ──"
curl -s http://localhost:3333/health && echo " ← local bridge OK"
curl -s "https://$DOMAIN/health" && echo " ← public HTTPS OK"
echo ""
echo "✅ Done. Now every tenant must re-scan their QR code in the CRM."
