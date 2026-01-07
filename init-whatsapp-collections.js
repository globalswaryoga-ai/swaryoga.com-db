#!/usr/bin/env node

/**
 * Initialize WhatsApp Collections & Indexes
 * This ensures collections exist and all indexes are created before webhook starts receiving messages
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function initializeCollections() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Initializing WhatsApp Collections                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    const crmDb = mongoose.connection.useDb(crmDbName);
    console.log(`✅ Connected to: ${crmDbName}\n`);

    // Initialize WhatsAppMessage collection
    console.log('💬 Initializing WhatsAppMessage collection...');
    try {
      const msgCollection = crmDb.collection('whatsappmessages');
      await msgCollection.createIndex({ leadId: 1, sentAt: -1 });
      await msgCollection.createIndex({ phoneNumber: 1, status: 1 });
      await msgCollection.createIndex({ sentBy: 1, sentAt: -1 });
      await msgCollection.createIndex({ waMessageId: 1 });
      await msgCollection.createIndex({ direction: 1, sentAt: -1 });
      await msgCollection.createIndex({ waMessageId: 1, direction: 1 }, { unique: true, sparse: true });
      console.log('  ✅ Indexes created (collection auto-created on first insert)\n');
    } catch (e) {
      console.log(`  ℹ️  ${e instanceof Error ? e.message : e}\n`);
    }

    // Initialize Conversation collection
    console.log('🗣️  Initializing Conversation collection...');
    try {
      const convCollection = crmDb.collection('conversations');
      await convCollection.createIndex({ participantPhoneNumber: 1 });
      await convCollection.createIndex({ updatedAt: -1 });
      console.log('  ✅ Indexes created (collection auto-created on first insert)\n');
    } catch (e) {
      console.log(`  ℹ️  ${e instanceof Error ? e.message : e}\n`);
    }

    console.log('✨ Collections initialized successfully!\n');
    console.log('═'.repeat(60));
    console.log(`\n✅ NEXT STEPS:\n`);
    console.log(`1. Send WhatsApp message to your business number`);
    console.log(`2. Wait 2-5 seconds`);
    console.log(`3. Run: node test-incoming-message.js`);
    console.log(`4. Check: https://your-domain.com/admin/crm/whatsapp\n`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

initializeCollections();
