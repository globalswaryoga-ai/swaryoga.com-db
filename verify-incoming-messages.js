#!/usr/bin/env node

/**
 * VERIFY INCOMING WHATSAPP MESSAGES
 * Check if messages from a specific phone number are stored in MongoDB
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI or MONGODB_URI_MAIN environment variable is not set');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO')));
  process.exit(1);
}

// Define schemas inline
const LeadSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  name: String,
  email: String,
  status: { type: String, enum: ['lead', 'prospect', 'customer', 'inactive'], default: 'lead' },
  source: { type: String, enum: ['website', 'import', 'api', 'manual', 'whatsapp'], default: 'manual' },
  lastMessageAt: { type: Date, index: true },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'leads' });

const WhatsAppMessageSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  phoneNumber: { type: String, required: true, index: true },
  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound', index: true },
  messageContent: String,
  messageType: { type: String, enum: ['text', 'template', 'media', 'interactive'], default: 'text' },
  status: { type: String, enum: ['queued', 'sent', 'delivered', 'read', 'failed'], default: 'queued', index: true },
  sentAt: { type: Date, default: Date.now },
  deliveredAt: Date,
  readAt: Date,
  waMessageId: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'whatsapp_messages' });

const Lead = mongoose.model('Lead', LeadSchema);
const WhatsAppMessage = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);

async function verifyMessages(phoneNumber) {
  try {
    console.log('\n🔍 VERIFYING INCOMING WHATSAPP MESSAGES\n');
    console.log(`📱 Phone Number: ${phoneNumber}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if lead exists
    const lead = await Lead.findOne({ phoneNumber }).lean();
    
    if (!lead) {
      console.log('❌ NO LEAD FOUND for this phone number');
      console.log('   This means no messages have been received yet.\n');
      console.log('📝 Action Items:');
      console.log('   1. Verify WHATSAPP_WEBHOOK_VERIFY_TOKEN is set in .env.local');
      console.log('   2. Check Meta Business Account webhook is pointing to:');
      console.log('      https://yourdomain.com/api/whatsapp/webhook');
      console.log('   3. Send a test message from WhatsApp to your business account\n');
      return;
    }

    console.log('✅ LEAD FOUND!');
    console.log(`   Lead ID: ${lead._id}`);
    console.log(`   Name: ${lead.name || '(not set)'}`);
    console.log(`   Status: ${lead.status}`);
    console.log(`   Source: ${lead.source}`);
    console.log(`   Last Message: ${lead.lastMessageAt ? new Date(lead.lastMessageAt).toLocaleString() : 'Never'}`);
    console.log(`   Created: ${new Date(lead.createdAt).toLocaleString()}\n`);

    // Check messages from this lead
    const messages = await WhatsAppMessage.find({ 
      leadId: lead._id,
      direction: 'inbound'
    }).sort({ sentAt: -1 }).lean();

    if (messages.length === 0) {
      console.log('⚠️  NO INCOMING MESSAGES FOUND');
      console.log('   Lead exists but no inbound messages recorded.\n');
      return;
    }

    console.log(`✅ FOUND ${messages.length} INCOMING MESSAGE(S)\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    messages.forEach((msg, index) => {
      console.log(`📨 Message #${index + 1}`);
      console.log(`   Content: "${msg.messageContent}"`);
      console.log(`   Type: ${msg.messageType}`);
      console.log(`   Status: ${msg.status}`);
      console.log(`   Received: ${new Date(msg.sentAt).toLocaleString()}`);
      console.log(`   Message ID: ${msg.waMessageId || '(pending)'}\n`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✅ SUMMARY: Incoming messages ARE WORKING!\n`);
    console.log(`   Total messages received: ${messages.length}`);
    console.log(`   Last message: ${new Date(messages[0].sentAt).toLocaleString()}\n`);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run verification
const phoneNumber = process.argv[2] || '9779006820';
verifyMessages(phoneNumber);
