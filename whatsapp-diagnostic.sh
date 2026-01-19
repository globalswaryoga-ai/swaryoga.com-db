#!/bin/bash

# Diagnostic script for WhatsApp message persistence issues

CRMAPIURL="${1:-https://swaryoga.com}"
AUTHTOKEN="${2:-admincrm}"

echo "🔍 WHATSAPP MESSAGE PERSISTENCE DIAGNOSTIC"
echo "=========================================="
echo ""

# 1. Check bridge connectivity
echo "1️⃣  Checking EC2 Bridge Status..."
BRIDGE_RESPONSE=$(curl -s -H "x-bridge-secret: swar-bridge-secret-2024" \
  http://52.91.198.23:3333/status 2>/dev/null | jq . 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "✅ Bridge Reachable"
  echo "$BRIDGE_RESPONSE" | jq '.status, .sessionReady, .chatCount, .queueSize' 2>/dev/null || echo "$BRIDGE_RESPONSE"
else
  echo "❌ Bridge Unreachable (EC2 may be down)"
fi

echo ""

# 2. Check recent webhook events
echo "2️⃣  Checking Recent Webhook Events..."
EVENTS=$(curl -s "$CRMAPIURL/api/admin/crm/whatsapp/webhook-events?limit=10" \
  -H "Authorization: Bearer $AUTHTOKEN" 2>/dev/null | jq '.data | length' 2>/dev/null)
echo "Recent webhook events: $EVENTS"

echo ""

# 3. Check recent messages in CRM
echo "3️⃣  Checking Recent CRM Messages..."
MESSAGES=$(curl -s "$CRMAPIURL/api/admin/crm/messages?limit=20&direction=outbound" \
  -H "Authorization: Bearer $AUTHTOKEN" 2>/dev/null | jq '.data.messages | length' 2>/dev/null)
echo "Recent outbound messages in CRM: $MESSAGES"

echo ""

# 4. Test sending a message via POST endpoint
echo "4️⃣  Testing Message Send via POST /api/admin/crm/messages..."
echo "(Note: Requires valid leadId - checking for available leads first)"

# Get a sample lead
LEAD_ID=$(curl -s "$CRMAPIURL/api/admin/crm/leads?limit=1" \
  -H "Authorization: Bearer $AUTHTOKEN" 2>/dev/null | jq -r '.data.leads[0]._id' 2>/dev/null)

if [ ! -z "$LEAD_ID" ] && [ "$LEAD_ID" != "null" ]; then
  echo "Using lead: $LEAD_ID"
  
  TEST_RESPONSE=$(curl -s -X POST "$CRMAPIURL/api/admin/crm/messages" \
    -H "Authorization: Bearer $AUTHTOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"leadId\": \"$LEAD_ID\",
      \"phoneNumber\": \"919876543210\",
      \"messageContent\": \"[DIAGNOSTIC TEST] $(date '+%H:%M:%S')\"
    }" 2>/dev/null)
  
  echo "Response: $TEST_RESPONSE" | jq . 2>/dev/null || echo "$TEST_RESPONSE"
else
  echo "⚠️  No leads found to test with"
fi

echo ""

# 5. Sync messages from bridge
echo "5️⃣  Testing Message Sync from Bridge..."
SYNC_RESPONSE=$(curl -s -X POST "$CRMAPIURL/api/admin/crm/sync-bridge-messages" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -H "Content-Type: application/json" 2>/dev/null)

echo "$SYNC_RESPONSE" | jq . 2>/dev/null || echo "$SYNC_RESPONSE"

echo ""
echo "=========================================="
echo "✅ DIAGNOSTIC COMPLETE"
echo ""
echo "Recommendations:"
echo "1. If bridge queue is high (>10), messages may be backing up"
echo "2. If webhook events = 0, incoming messages not being captured"
echo "3. Use sync endpoint to retroactively log bridge messages to CRM"
echo "4. Check browser console for 'sendMessage' logs"
