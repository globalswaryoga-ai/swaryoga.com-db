#!/bin/bash

# ============================================================
# Bridge Diagnostics - Check why 404 errors are happening
# ============================================================

echo "╔════════════════════════════════════════════════════════╗"
echo "║   WhatsApp Bridge - Diagnostics                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

EC2_IP="52.91.198.23"
EC2_USER="ubuntu"
SSH_KEY="deploy/wa-bridge/wa-bridge-key.pem"

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
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found at: $SSH_KEY"
  echo "   You need to download wa-bridge-key.pem from AWS"
  echo ""
  echo "Without SSH key, cannot check EC2 bridge status"
  echo "Run: bash deploy/wa-bridge/install-permanent.sh"
  echo ""
  exit 1
else
  echo "✅ SSH key found"
fi
echo ""

chmod 400 "$SSH_KEY"

# Check 3: EC2 connectivity
echo "═ CHECK 3: EC2 Connectivity ═══════════════════════════════"
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$EC2_USER@$EC2_IP" "echo 'connected'" &>/dev/null; then
  echo "✅ Can reach EC2 at $EC2_IP"
else
  echo "❌ Cannot reach EC2 at $EC2_IP"
  echo "   Check your internet connection or EC2 instance status"
  exit 1
fi
echo ""

# Check 4: Bridge process
echo "═ CHECK 4: Bridge Process ═════════════════════════════════"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'SSH_COMMANDS'
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

echo ""

# Check 5: Bridge port
echo "═ CHECK 5: Bridge Port (3333) ═════════════════════════════"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'SSH_COMMANDS'
if netstat -tuln 2>/dev/null | grep -q ":3333"; then
  echo "✅ Port 3333 is LISTENING"
elif ss -tuln 2>/dev/null | grep -q ":3333"; then
  echo "✅ Port 3333 is LISTENING"
else
  echo "❌ Port 3333 is NOT listening"
fi
SSH_COMMANDS

echo ""

# Check 6: Bridge endpoints
echo "═ CHECK 6: Bridge Endpoints ═══════════════════════════════"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'SSH_COMMANDS'
echo "Testing /health endpoint..."
RESPONSE=$(curl -s -m 5 -w "\n%{http_code}" http://localhost:3333/health 2>&1 || echo "Connection failed")
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
RESPONSE=$(curl -s -m 5 -w "\n%{http_code}" http://localhost:3333/status 2>&1 || echo "Connection failed")
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

SSH_COMMANDS

echo ""

# Check 7: Environment variables
echo "═ CHECK 7: Environment Variables ══════════════════════════"
if grep -q "BRIDGE_URL" .env.local 2>/dev/null; then
  echo "✅ BRIDGE_URL is set in .env.local"
  BRIDGE_URL=$(grep "BRIDGE_URL" .env.local | cut -d= -f2)
  echo "   Value: $BRIDGE_URL"
else
  echo "⚠️  BRIDGE_URL not explicitly set (using default)"
  echo "   Default: http://52.91.198.23:3333"
fi
echo ""

if grep -q "BRIDGE_SECRET" .env.local 2>/dev/null; then
  echo "✅ BRIDGE_SECRET is set in .env.local"
else
  echo "⚠️  BRIDGE_SECRET not set (using default)"
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
