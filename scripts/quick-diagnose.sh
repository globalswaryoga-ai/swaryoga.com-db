#!/bin/bash

# Quick diagnostic for both Meta and QR systems
echo "🚀 WhatsApp CRM Diagnostic"
echo "Generated: $(date)"
echo ""

source /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/.env.local

echo "=========================================="
echo "📋 CONFIGURATION CHECK"
echo "=========================================="
echo ""

echo "1️⃣  ENVIRONMENT VARIABLES"
if [ -z "$MONGODB_URI_MAIN" ]; then
  echo "   ❌ MONGODB_URI_MAIN: MISSING"
else
  echo "   ✅ MONGODB_URI_MAIN: SET"
fi

if [ -z "$WHATSAPP_ACCESS_TOKEN" ]; then
  echo "   ❌ WHATSAPP_ACCESS_TOKEN: MISSING"
else
  echo "   ✅ WHATSAPP_ACCESS_TOKEN: SET (${WHATSAPP_ACCESS_TOKEN:0:20}...)"
fi

if [ -z "$WHATSAPP_WEBHOOK_VERIFY_TOKEN" ]; then
  echo "   ❌ WHATSAPP_WEBHOOK_VERIFY_TOKEN: MISSING"
else
  echo "   ✅ WHATSAPP_WEBHOOK_VERIFY_TOKEN: SET"
fi

if [ -z "$WHATSAPP_BRIDGE_HTTP_URL" ]; then
  echo "   ❌ WHATSAPP_BRIDGE_HTTP_URL: MISSING"
else
  echo "   ✅ WHATSAPP_BRIDGE_HTTP_URL: $WHATSAPP_BRIDGE_HTTP_URL"
fi

if [ -z "$WHATSAPP_BRIDGE_SECRET" ]; then
  echo "   ❌ WHATSAPP_BRIDGE_SECRET: MISSING"
else
  echo "   ✅ WHATSAPP_BRIDGE_SECRET: SET"
fi

echo ""
echo "2️⃣  CONNECTIVITY TEST"

# Test Meta webhook
echo -n "   Testing Meta webhook... "
WEBHOOK_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "https://crm.swaryoga.com/api/whatsapp/webhook?debug=1")
if [ "$WEBHOOK_STATUS" = "403" ] || [ "$WEBHOOK_STATUS" = "200" ]; then
  echo "✅ Responding ($WEBHOOK_STATUS)"
else
  echo "❌ Error ($WEBHOOK_STATUS)"
fi

# Test QR Bridge
echo -n "   Testing QR Bridge... "
BRIDGE_STATUS=$(curl -s -m 5 -w "%{http_code}" -o /dev/null "$WHATSAPP_BRIDGE_HTTP_URL/status" 2>/dev/null)
if [ "$BRIDGE_STATUS" = "200" ]; then
  echo "✅ Connected ($BRIDGE_STATUS)"
elif [ -z "$BRIDGE_STATUS" ]; then
  echo "❌ No response (bridge down or unreachable)"
else
  echo "⚠️  Status $BRIDGE_STATUS"
fi

echo ""
echo "=========================================="
echo "🔧 NEXT STEPS"
echo "=========================================="
echo ""
echo "Meta Cloud API Issues:"
echo "  • Inbound messages not working?"
echo "    1. Check Meta Dashboard → WhatsApp → Configuration"
echo "    2. Verify Webhook URL: https://crm.swaryoga.com/api/whatsapp/webhook"
echo "    3. Verify Verify Token matches WHATSAPP_WEBHOOK_VERIFY_TOKEN"
echo "    4. Check 'messages' is subscribed in Webhook Fields"
echo ""
echo "QR WhatsApp Issues:"
echo "  • Connection unstable (on-off)?"
echo "    1. Check bridge is running: curl $WHATSAPP_BRIDGE_HTTP_URL/status"
echo "    2. Verify bridge secret is correct"
echo "    3. Check firewall/network allows connection to $WHATSAPP_BRIDGE_HTTP_URL"
echo "  • Messages not sending?"
echo "    1. Ensure connection is 'connected' status"
echo "    2. Check phone number is scanned in QR"
echo "    3. Verify send endpoint is working"
echo ""
