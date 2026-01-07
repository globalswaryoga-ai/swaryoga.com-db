#!/bin/bash

# Test sending a message via API to verify webhook works
echo "📱 Testing WhatsApp message flow..."
echo ""

# Step 1: Send a test message using Meta API
echo "1️⃣ Sending test message via Meta WhatsApp API..."

PHONE_ID="733788303156745"
VERIFY_TOKEN="ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d"
ACCESS_TOKEN="EAAZA17SDRZATgBQVYvi8NeGSvKZAfh2ao2621D9hDRVyJTBa2aAGfTnMuzm4EKshA3mgfVKdiFi4v7MFt3AKgQFay4LbJkQenFK32a3gN70cZCbSrUkCkAKr4vqZCZCGQwWHXpqMfZCc0SyB0t8ES4GZBLp65y5JPr1V3yLGLIGzcnlNezyZBFwZCwiahRB77QbZAV1vgZDZD"

# Send via Meta API - this will test the full webhook flow
curl -X POST "https://graph.facebook.com/v19.0/${PHONE_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919309986820",
    "type": "text",
    "text": {
      "preview_url": false,
      "body": "🧪 Test message from API - ' $(date '+%Y-%m-%d %H:%M:%S') '"
    }
  }' 2>&1 | head -20

echo ""
echo "2️⃣ Waiting 2 seconds for webhook to process..."
sleep 2

echo ""
echo "3️⃣ Checking database for new messages..."
cd /Users/mohankalburgi/swaryoga.com-db && node -e "
const mongoose = require('mongoose');
const uri = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryoga_admin_crm?retryWrites=true&w=majority';

mongoose.connect(uri).then(async () => {
  const schema = new mongoose.Schema({}, { strict: false });
  const WaMsg = mongoose.model('whatsappmessages', schema);
  
  const count = await WaMsg.countDocuments();
  const recent = await WaMsg.findOne({ direction: 'inbound' }).sort({ _id: -1 }).lean();
  
  console.log('✅ Total messages in database:', count);
  if (recent) {
    const timeStr = recent.sentAt ? new Date(recent.sentAt).toISOString() : 'unknown';
    console.log('📨 Most recent message:');
    console.log('   From:', recent.phoneNumber);
    console.log('   Time:', timeStr);
    console.log('   Text:', recent.messageContent);
    console.log('');
    console.log('🎉 Webhook is working!');
  } else {
    console.log('❌ No messages found - webhook may not be receiving');
  }
  
  process.exit(0);
}).catch(err => console.error('Error:', err.message));
"

echo ""
echo "4️⃣ Testing CRM access..."
echo "   Go to: https://crm.swaryoga.com/admin/crm/whatsapp-meta"
echo "   Messages should appear in the inbox"
