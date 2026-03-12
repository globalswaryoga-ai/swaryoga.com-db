#!/bin/bash

# ============================================================
# Bridge Diagnostics - Check why 404 errors are happening
# ============================================================

ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BRIDGE_URL="${WHATSAPP_BRIDGE_HTTP_URL:-${WHATSAPP_BRIDGE_URL:-${NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL:-${BRIDGE_URL:-http://localhost:3333}}}}"
BRIDGE_URL="${BRIDGE_URL%/}"
BRIDGE_HOST="$(printf '%s' "$BRIDGE_URL" | sed -E 's#^https?://([^/:]+).*#\1#')"
BRIDGE_SSH_USER="${WHATSAPP_BRIDGE_SSH_USER:-ubuntu}"
BRIDGE_SSH_KEY="${WHATSAPP_BRIDGE_SSH_KEY_PATH:-}"

echo "╔════════════════════════════════════════════════════════╗"
echo "║   WhatsApp Bridge - Diagnostics                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check 1: API route exists
echo "═ CHECK 1: API Route File ═════════════════════════════════"
if [ -f "app/api/admin/crm/whatsapp/qr-bridge/route.ts" ]; then
  echo "✅ Route file EXISTS at app/api/admin/crm/whatsapp/qr-bridge/route.ts"
else
  echo "❌ Route file MISSING"
fi
echo ""

# Check 2: SSH key exists
echo "═ CHECK 2: SSH Key ════════════════════════════════════════"
if [ -z "$BRIDGE_SSH_KEY" ] || [ ! -f "$BRIDGE_SSH_KEY" ]; then
  echo "⚠️  SSH key not configured or not found"
  echo "   Set WHATSAPP_BRIDGE_SSH_KEY_PATH in .env.local to enable remote diagnostics"
  echo ""
  echo "Configured bridge URL: $BRIDGE_URL"
  echo "Skipping remote SSH checks and continuing with bridge URL diagnostics only"
else
  echo "✅ SSH key found"
  chmod 400 "$BRIDGE_SSH_KEY"
fi
echo ""

# Check 3: EC2 connectivity
echo "═ CHECK 3: EC2 Connectivity ═══════════════════════════════"
if [ -n "$BRIDGE_SSH_KEY" ] && [ -f "$BRIDGE_SSH_KEY" ] && ssh -i "$BRIDGE_SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$BRIDGE_SSH_USER@$BRIDGE_HOST" "echo 'connected'" &>/dev/null; then
  echo "✅ Can reach bridge host at $BRIDGE_HOST"
else
  echo "⚠️  Remote SSH connectivity unavailable or not configured"
  echo "   Bridge URL diagnostics will still run against $BRIDGE_URL"
fi
echo ""

# Check 4: Bridge process
echo "═ CHECK 4: Bridge Process ═════════════════════════════════"
if [ -n "$BRIDGE_SSH_KEY" ] && [ -f "$BRIDGE_SSH_KEY" ]; then
ssh -i "$BRIDGE_SSH_KEY" "$BRIDGE_SSH_USER@$BRIDGE_HOST" << 'SSH_COMMANDS'
echo "Checking if bridge container is running..."
if docker ps | grep -q "wa-bridge"; then
  echo "✅ Bridge container is RUNNING"
  echo ""
  echo "Container details:"
  docker ps | grep wa-bridge
else
  echo "❌ Bridge container is NOT running"
  echo ""
  echo "Recent container logs:"
  docker logs wa-bridge 2>/dev/null | tail -20 || echo "No logs available"
fi
SSH_COMMANDS
else
  echo "ℹ️  Skipping remote process check (no SSH key configured)"
fi

echo ""

# Check 5: Bridge port
echo "═ CHECK 5: Bridge Port (3333) ═════════════════════════════"
if [ -n "$BRIDGE_SSH_KEY" ] && [ -f "$BRIDGE_SSH_KEY" ]; then
ssh -i "$BRIDGE_SSH_KEY" "$BRIDGE_SSH_USER@$BRIDGE_HOST" << 'SSH_COMMANDS'
if netstat -tuln 2>/dev/null | grep -q ":3333"; then
  echo "✅ Port 3333 is LISTENING"
elif ss -tuln 2>/dev/null | grep -q ":3333"; then
  echo "✅ Port 3333 is LISTENING"
else
  echo "❌ Port 3333 is NOT listening"
fi
SSH_COMMANDS
else
  echo "ℹ️  Skipping remote port check (no SSH key configured)"
fi

echo ""

# Check 6: Bridge endpoints
echo "═ CHECK 6: Bridge Endpoints ═══════════════════════════════"
echo "Testing /health endpoint..."
RESPONSE=$(curl -s -m 5 -w "\n%{http_code}" "$BRIDGE_URL/health" 2>&1 || echo "Connection failed")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ /health endpoint: HTTP $HTTP_CODE"
  echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ /health endpoint: HTTP 404 (Not Found)"
  echo "   Bridge is running but endpoint missing"
elif [ -z "$HTTP_CODE" ]; then
  echo "❌ /health endpoint: Cannot connect"
  echo "   Bridge may not be running"
else
  echo "⚠️  /health endpoint: HTTP $HTTP_CODE"
  echo "   Response: $BODY"
fi

echo ""
echo "Testing /status endpoint..."
RESPONSE=$(curl -s -m 5 -w "\n%{http_code}" "$BRIDGE_URL/status" 2>&1 || echo "Connection failed")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ /status endpoint: HTTP $HTTP_CODE"
  echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ /status endpoint: HTTP 404 (Not Found)"
elif [ -z "$HTTP_CODE" ]; then
  echo "❌ /status endpoint: Cannot connect"
else
  echo "⚠️  /status endpoint: HTTP $HTTP_CODE"
fi

echo ""

# Check 7: Environment variables
echo "═ CHECK 7: Environment Variables ══════════════════════════"
echo "✅ Effective bridge URL: $BRIDGE_URL"
echo ""

if [ -n "${WHATSAPP_BRIDGE_SECRET:-${WHATSAPP_WEB_BRIDGE_SECRET:-${BRIDGE_SECRET:-}}}" ]; then
  echo "✅ Bridge secret is configured in environment"
else
  echo "⚠️  Bridge secret not set (using default)"
fi
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║            Diagnostics Complete                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Summary
echo "SUMMARY:"
echo "────────────────────────────────────────────────────────"
echo "If ✅ on all checks: Bridge is working, refresh browser"
echo "If ❌ on bridge checks: Run emergency restart:"
echo "   bash scripts/emergency-restart-bridge.sh"
echo ""
