#!/bin/bash
# Quick Bridge Status Check - Run anytime to verify system is healthy

echo "═══════════════════════════════════════════════════════════"
echo "        🏥 SWAR YOGA BRIDGE HEALTH CHECK - $(date +%H:%M:%S)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Function to check port
check_port() {
  if lsof -i :3333 &>/dev/null; then
    echo "✅ Port 3333 is accessible"
    return 0
  else
    echo "❌ Port 3333 is not responding"
    return 1
  fi
}

# Function to check PM2
check_pm2() {
  if pm2 list 2>/dev/null | grep -q "wa-baileys.*online"; then
    echo "✅ PM2 bridge service is online"
    return 0
  else
    echo "❌ PM2 bridge service is offline"
    return 1
  fi
}

# Function to check bridge status
check_bridge_status() {
  local status=$(curl -s -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/status 2>/dev/null)
  
  if [ -z "$status" ]; then
    echo "❌ Bridge not responding"
    return 1
  fi
  
  local connected=$(echo "$status" | jq -r '.connected' 2>/dev/null)
  local qr_available=$(echo "$status" | jq -r '.qrAvailable' 2>/dev/null)
  local phone=$(echo "$status" | jq -r '.phone' 2>/dev/null)
  
  if [ "$connected" = "true" ]; then
    echo "✅ Bridge connected to WhatsApp"
    echo "   Phone: $phone"
    return 0
  elif [ "$qr_available" = "true" ]; then
    echo "⏳ Bridge waiting for QR scan"
    echo "   Visit: http://localhost:3000/admin/crm/qr"
    return 0
  else
    echo "❌ Bridge not ready"
    return 1
  fi
}

# Run checks
echo "🔍 SYSTEM CHECKS:"
echo "────────────────────────────────────────────────────────"

check_port
check_pm2
check_bridge_status

echo ""
echo "📊 FULL DIAGNOSTIC:"
echo "────────────────────────────────────────────────────────"
echo "Run: node scripts/full-system-check.js"
echo ""
echo "🛠️  RESTART BRIDGE IF NEEDED:"
echo "────────────────────────────────────────────────────────"
echo "pm2 restart wa-baileys"
echo ""
echo "═══════════════════════════════════════════════════════════"
