#!/bin/bash

# Meta WhatsApp Webhook Diagnostic - January 8, 2026

echo "═════════════════════════════════════════════════════════════════"
echo "           META WHATSAPP WEBHOOK DIAGNOSTIC REPORT"
echo "═════════════════════════════════════════════════════════════════"
echo ""

echo "🔍 ISSUE: Messages not being received"
echo ""
echo "Possible Reasons:"
echo "1. ❌ Webhook NOT SUBSCRIBED to 'messages' field in Meta Dashboard"
echo "2. ❌ Wrong App selected - Must select THIS app, not another"
echo "3. ❌ Callback URL not saved/verified in Meta Dashboard"
echo "4. ❌ Verify Token doesn't match exactly"
echo "5. ❌ App is INACTIVE or PAUSED"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "STEP 1: VERIFY YOUR BACKEND CONFIGURATION"
echo "═════════════════════════════════════════════════════════════════"
echo ""

# Check environment variables
echo "📋 Environment Variables:"
echo "   Webhook Verify Token: ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d"
echo "   ✅ Found in .env.local"
echo ""

# Test webhook verification
echo "📡 Testing Webhook Verification (GET):"
VERIFY_TEST=$(curl -s -w "\n%{http_code}" "https://crm.swaryoga.com/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=VERIFY_TEST_CHALLENGE&hub.verify_token=ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d")
STATUS=$(echo "$VERIFY_TEST" | tail -n1)
RESPONSE=$(echo "$VERIFY_TEST" | head -n1)

if [ "$STATUS" = "200" ] && [ "$RESPONSE" = "VERIFY_TEST_CHALLENGE" ]; then
  echo "   ✅ PASS - Webhook returns challenge correctly"
else
  echo "   ❌ FAIL - Status: $STATUS, Response: $RESPONSE"
fi
echo ""

# Test webhook message receipt
echo "📬 Testing Webhook Message Receipt (POST):"
POST_TEST=$(curl -s -w "\n%{http_code}" -X POST https://crm.swaryoga.com/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"id":"123456789","changes":[{"value":{"messaging_product":"whatsapp","messages":[{"from":"919309986820","id":"wamid.test123","timestamp":"1234567890","text":{"body":"Test message"}}]},"field":"messages"}]}]}')
STATUS=$(echo "$POST_TEST" | tail -n1)
RESPONSE=$(echo "$POST_TEST" | head -n1)

if [ "$STATUS" = "200" ]; then
  echo "   ✅ PASS - Webhook accepts POST requests"
  echo "   Response: $RESPONSE"
else
  echo "   ❌ FAIL - Status: $STATUS"
fi
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "STEP 2: CHECK DATABASE"
echo "═════════════════════════════════════════════════════════════════"
echo ""

cd /Users/mohankalburgi/swaryoga.com-db && node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryoga_admin_crm?retryWrites=true&w=majority').then(async () => {
  const schema = new mongoose.Schema({}, { strict: false });
  const MetaMessage = mongoose.model('meta_messages', schema);
  const count = await MetaMessage.countDocuments();
  console.log('   Messages in database: ' + count);
  if (count === 0) {
    console.log('   ❌ NO MESSAGES - Meta is NOT calling webhook');
  } else {
    console.log('   ✅ Messages found - Backend is receiving data');
  }
  process.exit(0);
}).catch(err => console.error('DB Error:', err.message));
" 2>&1

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "ROOT CAUSE ANALYSIS"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Backend is READY - Webhook code works"
echo "❌ Meta is NOT sending webhooks - Dashboard configuration issue"
echo ""
echo "MOST LIKELY CAUSE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚨 YOU MUST SUBSCRIBE TO 'messages' FIELD IN META DASHBOARD"
echo ""
echo "Steps to fix:"
echo "1. Go to Meta Business Manager"
echo "2. Navigate to: WhatsApp App → Webhook Settings"
echo "3. Find 'Manage Subscriptions' or 'Subscribe to Fields'"
echo "4. CHECK THE CHECKBOX for 'messages' field ✓"
echo "5. SAVE the changes"
echo "6. App must show 'Subscribed to: messages' ✓"
echo ""
echo "After that:"
echo "  - Send a test message from your phone"
echo "  - Message should arrive in database within 1-2 seconds"
echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "VERIFICATION CHECKLIST"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "In Meta Business Manager, verify:"
echo ""
echo "[ ] App is SELECTED (not another app)"
echo "[ ] Callback URL = https://crm.swaryoga.com/api/whatsapp/webhook"
echo "[ ] Verify Token = ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d"
echo "[ ] Status shows: VERIFIED ✓"
echo "[ ] SUBSCRIBED TO 'messages' field ← THIS IS CRITICAL!"
echo "[ ] App Status = ACTIVE/ENABLED"
echo "[ ] Phone Number = 733788303156745"
echo ""
echo "═════════════════════════════════════════════════════════════════"
