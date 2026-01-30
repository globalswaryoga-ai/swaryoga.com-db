#!/usr/bin/env node
/**
 * Check recent template messages sent via Meta API
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  const dbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Get recent template messages
    console.log('\n=== Recent Template Messages (last 24 hours) ===\n');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const templateMessages = await db.collection('whatsapp_messages')
      .find({ 
        messageType: 'template',
        sentAt: { $gte: oneDayAgo }
      })
      .sort({ sentAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`Found ${templateMessages.length} template messages\n`);
    
    templateMessages.forEach((msg, i) => {
      console.log(`--- Template ${i + 1} ---`);
      console.log('Phone:', msg.phoneNumber);
      console.log('Status:', msg.status);
      console.log('Provider:', msg.provider);
      console.log('Template:', msg.metadata?.template?.templateName || 'N/A');
      console.log('WA Message ID:', msg.waMessageId || 'NOT SET');
      console.log('Failure Reason:', msg.failureReason || 'None');
      console.log('Sent At:', msg.sentAt);
      console.log('');
    });
    
    // Check for failed template messages
    console.log('\n=== Failed Template Messages ===\n');
    const failedTemplates = await db.collection('whatsapp_messages')
      .find({ 
        messageType: 'template',
        status: 'failed',
        sentAt: { $gte: oneDayAgo }
      })
      .sort({ sentAt: -1 })
      .limit(5)
      .toArray();
    
    if (failedTemplates.length === 0) {
      console.log('No failed template messages found.');
    } else {
      failedTemplates.forEach((msg, i) => {
        console.log(`Failed ${i + 1}: ${msg.phoneNumber} - ${msg.failureReason || 'Unknown error'}`);
      });
    }
    
    // Check webhook events for template status updates
    console.log('\n=== Recent Webhook Status Events ===\n');
    const webhookEvents = await db.collection('whatsapp_webhook_events')
      .find({ 
        createdAt: { $gte: oneDayAgo },
        'raw.entry.changes.value.statuses': { $exists: true }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    if (webhookEvents.length === 0) {
      console.log('No status webhook events found.');
    } else {
      webhookEvents.forEach((evt, i) => {
        const statuses = evt.raw?.entry?.[0]?.changes?.[0]?.value?.statuses || [];
        statuses.forEach(s => {
          console.log(`Status: ${s.status} for ${s.recipient_id} - ${s.timestamp}`);
          if (s.errors) console.log('  Errors:', JSON.stringify(s.errors));
        });
      });
    }
    
  } finally {
    await client.close();
  }
}

main().catch(console.error);
