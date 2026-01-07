#!/usr/bin/env node

/**
 * Check available templates and broadcast status
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'swaryogaDB';

async function checkStatus() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('📊 BROADCAST SYSTEM STATUS\n');
    console.log('═══════════════════════════════════════════\n');

    // 1. Leads count
    const leadCount = await db.collection('leads').countDocuments();
    console.log(`📋 Leads: ${leadCount}`);
    if (leadCount === 0) {
      console.log('   ⚠️  No leads. Need to import leads first.\n');
    } else {
      const sample = await db.collection('leads').findOne();
      console.log(`   ✓ Sample: ${sample.name} (${sample.phoneNumber})\n`);
    }

    // 2. Templates
    console.log('📧 Templates:');
    const allTemplates = await db.collection('whatsapptemplates').find({}).toArray();
    
    if (allTemplates.length === 0) {
      console.log('   ❌ No templates found\n');
    } else {
      const approved = allTemplates.filter(t => t.status === 'APPROVED');
      const pending = allTemplates.filter(t => t.status === 'PENDING');
      const rejected = allTemplates.filter(t => t.status === 'REJECTED');

      console.log(`   Total: ${allTemplates.length}`);
      console.log(`   ✅ Approved: ${approved.length}`);
      console.log(`   ⏳ Pending: ${pending.length}`);
      console.log(`   ❌ Rejected: ${rejected.length}\n`);

      if (allTemplates.length > 0) {
        console.log('   Templates:');
        allTemplates.forEach((t, i) => {
          const icon = t.status === 'APPROVED' ? '✅' : t.status === 'PENDING' ? '⏳' : '❌';
          console.log(`     ${i+1}. ${icon} ${t.templateName} (${t.status})`);
        });
        console.log();
      }
    }

    // 3. Broadcast runs
    console.log('📢 Broadcast Runs:');
    const runs = await db.collection('broadcastruns').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    if (runs.length === 0) {
      console.log('   No broadcast runs yet\n');
    } else {
      console.log(`   Total (showing last 5):`);
      runs.forEach((run, i) => {
        const stats = run.stats;
        console.log(`   ${i+1}. "${run.name}"`);
        console.log(`      Status: ${run.status} | Sent: ${stats.sent}/${stats.total}`);
      });
      console.log();
    }

    // 4. Broadcast messages
    console.log('💬 Broadcast Messages:');
    const msgCount = await db.collection('broadcastrunmessages').countDocuments();
    const sentCount = await db.collection('broadcastrunmessages').countDocuments({ status: 'sent' });
    const failedCount = await db.collection('broadcastrunmessages').countDocuments({ status: 'failed' });
    const pendingCount = await db.collection('broadcastrunmessages').countDocuments({ status: 'pending' });

    console.log(`   Total: ${msgCount}`);
    console.log(`   ✅ Sent: ${sentCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   ⏳ Pending: ${pendingCount}\n`);

    console.log('═══════════════════════════════════════════\n');

    // Recommendations
    if (leadCount === 0) {
      console.log('📌 NEXT STEPS:\n');
      console.log('1️⃣  Import Leads:');
      console.log('    • Go to /admin/crm/leads');
      console.log('    • Click "Bulk Upload"');
      console.log('    • Upload CSV with leads\n');
    }

    if (allTemplates.filter(t => t.status === 'APPROVED').length === 0) {
      console.log('2️⃣  Create & Approve Template:');
      console.log('    • Go to /admin/crm/whatsapp/templates');
      console.log('    • Click "Create Template"');
      console.log('    • Fill in template details');
      console.log('    • Submit for Meta approval');
      console.log('    • Check WhatsApp Business Account for approval status\n');
    }

    if (leadCount > 0 && allTemplates.filter(t => t.status === 'APPROVED').length > 0) {
      console.log('✅ READY TO BROADCAST!\n');
      console.log('   1. Go to /admin/crm/broadcast');
      console.log('   2. Select a template');
      console.log('   3. Select or filter leads');
      console.log('   4. Click "Send Broadcast Now"\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkStatus();
