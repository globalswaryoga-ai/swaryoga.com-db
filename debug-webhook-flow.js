#!/usr/bin/env node
/**
 * DEBUG: Simulate webhook flow to identify where messages get lost
 * This recreates the exact webhook handling logic locally to trace execution
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  console.log('\n🔍 WEBHOOK FLOW DIAGNOSTICS\n');
  
  // 1. Connect to DB
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN || 'mongodb://localhost:27017/test';
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  console.log('📦 Connecting to MongoDB:', MONGODB_URI.split('@')[1] || MONGODB_URI.slice(0, 30));
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');
  
  // 2. Get CRM database
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
  console.log('📦 Using CRM database:', CRM_DB_NAME);
  
  // 3. Import schemas to understand structure
  const fs = require('fs');
  const schemasPath = './lib/schemas/enterpriseSchemas.ts';
  
  if (!fs.existsSync(schemasPath)) {
    console.error('❌ enterpriseSchemas.ts not found at', schemasPath);
    process.exit(1);
  }
  
  console.log('✅ Schemas file found\n');
  
  // 4. Check if messages collection exists and has data
  try {
    const collections = await crmDb.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('📋 Collections in CRM DB:', collectionNames.filter(n => n.includes('message') || n.includes('lead') || n.includes('whatsapp')).join(', '));
    
    // 5. Check WhatsAppMessage collection
    const messageCount = await crmDb.collection('whatsappmessages').countDocuments();
    console.log(`📊 Total WhatsAppMessages: ${messageCount}\n`);
  } catch (e) {
    console.log('⚠️  Could not list collections:', e.message);
  }
  
  // 6. Create test webhook payload
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '999999999999',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              messages: [
                {
                  from: '919309986820',
                  id: 'wamid.test_' + Date.now(),
                  timestamp: Math.floor(Date.now() / 1000),
                  type: 'text',
                  text: {
                    body: `🧪 Test message at ${new Date().toISOString()}`,
                  },
                },
              ],
              contacts: [
                {
                  profile: {
                    name: 'Test User',
                  },
                  wa_id: '919309986820',
                },
              ],
              metadata: {
                display_phone_number: '919309986821',
                phone_number_id: 'test123',
                business_account_id: 'test456',
              },
            },
          },
        ],
      },
    ],
  };
  
  console.log('📤 Test webhook payload prepared\n');
  console.log('Payload structure:');
  console.log('  - entries:', testPayload.entry.length);
  console.log('  - changes in entry[0]:', testPayload.entry[0].changes.length);
  console.log('  - messages in change[0].value:', testPayload.entry[0].changes[0].value.messages.length);
  console.log('  - message ID:', testPayload.entry[0].changes[0].value.messages[0].id);
  console.log('  - from:', testPayload.entry[0].changes[0].value.messages[0].from);
  console.log('  - body:', testPayload.entry[0].changes[0].value.messages[0].text.body);
  
  // 7. Now trace through the webhook logic step by step
  console.log('\n🔄 SIMULATING WEBHOOK HANDLER LOGIC:\n');
  
  const entry = testPayload.entry[0];
  const change = entry.changes[0];
  const value = change.value;
  
  console.log('✅ Got entry.changes[0].value');
  
  // Extract messages
  const messages = Array.isArray(value?.messages) ? value.messages : [];
  console.log(`✅ Extracted ${messages.length} messages from payload\n`);
  
  if (messages.length === 0) {
    console.error('❌ ERROR: No messages found! Webhook would exit here.');
    process.exit(1);
  }
  
  // Process first message
  const msg = messages[0];
  console.log('Processing message:', {
    id: msg.id,
    from: msg.from,
    type: msg.type,
    hasText: !!msg.text,
  });
  
  // Normalize phone
  const from = String(msg?.from || '').replace(/\D/g, '');
  console.log('✅ Normalized phone:', from);
  
  if (!from) {
    console.error('❌ ERROR: No phone number! Webhook would skip.');
    process.exit(1);
  }
  
  // Extract body
  const body = msg?.text?.body ? String(msg.text.body).trim() : '';
  console.log('✅ Extracted body:', body.substring(0, 60));
  
  if (!body) {
    console.error('❌ ERROR: No message body! Webhook would skip.');
    process.exit(1);
  }
  
  // Get or create lead
  console.log('\n🔍 Lead lookup:');
  
  try {
    // Import Lead model
    const { getLead } = await import('./lib/schemas/enterpriseSchemas.ts');
    const Lead = getLead ? getLead() : null;
    
    if (!Lead) {
      console.error('❌ Could not get Lead model');
      process.exit(1);
    }
    
    let lead = await Lead.findOne({ phoneNumber: from }).lean();
    
    if (!lead) {
      console.log('  ✅ Lead not found, would create new');
      const created = await Lead.create({
        phoneNumber: from,
        source: 'whatsapp',
        status: 'lead',
        lastMessageAt: new Date(),
      });
      lead = created.toObject();
      console.log('  ✅ Lead created:', lead._id);
    } else {
      console.log('  ✅ Lead found:', lead._id);
    }
    
    if (!lead?._id) {
      console.error('❌ ERROR: No lead ID! Webhook would skip.');
      process.exit(1);
    }
    
    // Now try to upsert message
    console.log('\n💾 Message persistence:');
    
    const { getWhatsAppMessage } = await import('./lib/schemas/enterpriseSchemas.ts');
    const WhatsAppMessage = getWhatsAppMessage ? getWhatsAppMessage() : null;
    
    if (!WhatsAppMessage) {
      console.error('❌ Could not get WhatsAppMessage model');
      process.exit(1);
    }
    
    const inboundWaMessageId = msg.id;
    console.log('  Message ID:', inboundWaMessageId);
    console.log('  Lead ID:', lead._id);
    console.log('  Phone:', from);
    
    const now = new Date();
    const result = await WhatsAppMessage.updateOne(
      { waMessageId: inboundWaMessageId, direction: 'inbound' },
      {
        $setOnInsert: {
          leadId: lead._id,
          phoneNumber: from,
          direction: 'inbound',
          messageType: 'text',
          messageContent: body,
          status: 'delivered',
          deliveredAt: now,
          sentAt: now,
          waMessageId: inboundWaMessageId,
          isRead: false,
        },
      },
      { upsert: true }
    );
    
    console.log('  ✅ updateOne completed:');
    console.log('    - matched:', result?.matchedCount);
    console.log('    - upserted:', result?.upsertedCount);
    console.log('    - modified:', result?.modifiedCount);
    
    // Verify it was saved
    const saved = await WhatsAppMessage.findOne({ waMessageId: inboundWaMessageId });
    if (saved) {
      console.log('  ✅ Message verified in database!');
      console.log('    - ID:', saved._id);
      console.log('    - Content:', saved.messageContent.substring(0, 40));
    } else {
      console.error('  ❌ Message NOT found after upsert!');
    }
    
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
  
  console.log('\n✅ WEBHOOK FLOW COMPLETED SUCCESSFULLY\n');
  
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
