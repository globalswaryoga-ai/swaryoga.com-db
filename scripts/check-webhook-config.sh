#!/bin/bash

# Meta Webhook Configuration Helper
# This helps verify and configure webhook subscriptions for inbound messages

echo "🔧 META WEBHOOK CONFIGURATION CHECKER"
echo "════════════════════════════════════════════════════════"
echo ""

# Read from .env.local
source .env.local

PHONE_ID="${WHATSAPP_PHONE_NUMBER_ID}"
ACCESS_TOKEN="${WHATSAPP_ACCESS_TOKEN}"
WEBHOOK_URL="https://crm.swaryoga.com/api/whatsapp/webhook"

echo "📋 Current Configuration:"
echo "   Phone ID: $PHONE_ID"
echo "   Webhook URL: $WEBHOOK_URL"
echo ""

# Step 1: Get current webhook subscriptions
echo "📡 Step 1: Checking current webhook subscriptions..."
echo "   Running: GET /api/v24.0/{phone_id}/subscribed_fields"
echo ""

curl -s "https://graph.facebook.com/v24.0/${PHONE_ID}/subscribed_fields?access_token=${ACCESS_TOKEN}" | jq '.' 2>/dev/null || echo "Error fetching subscriptions"

echo ""
echo "════════════════════════════════════════════════════════"
echo ""
echo "🔧 TO ENABLE INBOUND MESSAGES:"
echo ""
echo "Option 1: Via cURL (Run this command):"
echo "─────────────────────────────────────────────────────────"
echo ""
echo "curl -X POST \"https://graph.facebook.com/v24.0/${PHONE_ID}/subscribed_fields\" \\"
echo "  -H \"Authorization: Bearer ${ACCESS_TOKEN}\" \\"
echo "  -d 'subscribed_fields=messages,message_status,message_template_status_update,message_echo'"
echo ""
echo "─────────────────────────────────────────────────────────"
echo ""
echo "Option 2: OR via Meta Dashboard:"
echo "─────────────────────────────────────────────────────────"
echo "1. Go to: https://developers.facebook.com/apps/"
echo "2. Select your Swar Yoga App"
echo "3. Go to: WhatsApp > Configuration"
echo "4. Under 'Webhook Fields', subscribe to:"
echo "   ✓ messages"
echo "   ✓ message_status"
echo "   ✓ message_template_status_update"
echo "   ✓ message_echo"
echo "5. Verify your webhook URL: $WEBHOOK_URL"
echo "6. Verify webhook token: SWAR_YOGA_MOHAN_WT_SETUP"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""
echo "📱 CRITICAL: For inbound from REAL numbers, you need:"
echo "   • App Review & Approval (not just Tester)"
echo "   • OR use Meta's Test Number: +1 (631) 555-0117"
echo ""
echo "════════════════════════════════════════════════════════"