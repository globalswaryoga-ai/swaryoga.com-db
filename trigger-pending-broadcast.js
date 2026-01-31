/**
 * Manual script to trigger pending QR broadcasts
 * Run: node trigger-pending-broadcast.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || process.env.WHATSAPP_BRIDGE_URL || 'http://52.91.198.23:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

async function fetchWithTimeout(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ No MongoDB URI found');
    process.exit(1);
  }

  console.log('📡 Connecting to MongoDB...');
  await mongoose.connect(uri);
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');

  // Find the pending scheduled broadcast with 138 messages
  const run = await crmDb.collection('broadcast_runs').findOne({
    _id: new mongoose.Types.ObjectId('697ca78979200d2a6a31e10d')
  });

  if (!run) {
    console.error('❌ Broadcast run not found');
    process.exit(1);
  }

  console.log('📋 Found broadcast:', run.name, 'Status:', run.status, 'Stats:', run.stats);

  // Get template
  const template = await crmDb.collection('whatsapp_templates').findOne({
    _id: run.templateId
  });

  if (!template) {
    console.error('❌ Template not found');
    process.exit(1);
  }

  console.log('📝 Template:', template.templateName);
  console.log('   Header:', template.headerFormat, template.headerContent);
  console.log('   Body:', template.templateContent?.substring(0, 100) + '...');
  console.log('   HeaderMedia:', template.headerMedia);

  // Mark run as running
  await crmDb.collection('broadcast_runs').updateOne(
    { _id: run._id },
    { $set: { status: 'running', startedAt: new Date() } }
  );

  // Get pending messages
  const pendingMessages = await crmDb.collection('broadcast_run_messages').find({
    runId: run._id,
    status: 'pending'
  }).toArray();

  console.log(`\n📤 Processing ${pendingMessages.length} pending messages...\n`);

  let sent = 0, failed = 0;

  // Build message content
  const rawContent = String(template.templateContent || '').trim();
  const templateContent = rawContent
    .replace(/•\s*\[QUICK_REPLY\][^\n]*/gi, '')
    .replace(/\[QUICK_REPLY\][^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const buttons = Array.isArray(template.buttons) ? template.buttons : [];
  const buttonTitles = buttons.filter(b => b.title).map(b => String(b.title).substring(0, 20));
  const footerText = template.footerText || 'Swar Yoga';

  // Check for header media
  const headerMedia = template.headerMedia;
  let mediaUrl = headerMedia?.url || headerMedia?.link || null;
  const hasImage = mediaUrl && headerMedia?.kind === 'image';

  console.log('Message config:');
  console.log('  Has image:', hasImage, mediaUrl?.substring(0, 50));
  console.log('  Buttons:', buttonTitles);
  console.log('  Footer:', footerText);
  console.log('');

  for (const msg of pendingMessages) {
    const to = msg.phoneNumber;
    
    try {
      console.log(`Sending to ${to}...`);

      // Mark as sending
      await crmDb.collection('broadcast_run_messages').updateOne(
        { _id: msg._id },
        { $set: { status: 'sending' } }
      );

      let response;

      if (hasImage && buttonTitles.length > 0) {
        // Use /send-template for image + buttons
        response = await fetchWithTimeout(`${BRIDGE_URL}/send-template`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bridge-secret': BRIDGE_SECRET,
          },
          body: JSON.stringify({
            to: to,
            imageUrl: mediaUrl,
            bodyText: templateContent,
            buttons: buttonTitles,
            footerText: footerText
          }),
        }, 30000);
      } else if (hasImage) {
        // Image without buttons - use /send with media type
        response = await fetchWithTimeout(`${BRIDGE_URL}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bridge-secret': BRIDGE_SECRET,
          },
          body: JSON.stringify({
            to: to,
            type: 'media',
            url: mediaUrl,
            caption: templateContent,
          }),
        }, 30000);
      } else {
        // Text only
        response = await fetchWithTimeout(`${BRIDGE_URL}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bridge-secret': BRIDGE_SECRET,
          },
          body: JSON.stringify({
            to: to,
            type: 'text',
            message: templateContent,
          }),
        }, 30000);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Bridge error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      console.log(`  ✅ Sent! ID: ${result?.id || result?.key?.id || 'unknown'}`);

      // Mark as sent
      await crmDb.collection('broadcast_run_messages').updateOne(
        { _id: msg._id },
        { $set: { status: 'sent', sentAt: new Date(), waMessageId: result?.id || result?.key?.id } }
      );

      // Also create WhatsApp message record
      await crmDb.collection('whatsapp_messages').insertOne({
        leadId: msg.leadId,
        phoneNumber: to,
        direction: 'outbound',
        messageType: 'template',
        templateId: template._id,
        templateVariables: {},
        messageContent: templateContent,
        status: 'sent',
        sentAt: new Date(),
        provider: 'qr',
        waMessageId: result?.id || result?.key?.id,
        metadata: {
          broadcast: { runId: String(run._id) },
          template: {
            templateName: template.templateName,
            headerFormat: template.headerFormat,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      sent++;

      // Delay between messages (2 seconds to be safe)
      await delay(2000);

    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
      
      await crmDb.collection('broadcast_run_messages').updateOne(
        { _id: msg._id },
        { $set: { status: 'failed', failureReason: err.message } }
      );

      failed++;

      // Still delay to avoid rate limits
      await delay(1000);
    }
  }

  // Update run stats
  const allMessages = await crmDb.collection('broadcast_run_messages').aggregate([
    { $match: { runId: run._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();

  const statusMap = {};
  allMessages.forEach(s => { statusMap[s._id] = s.count; });

  const finalStats = {
    total: (statusMap.sent || 0) + (statusMap.failed || 0) + (statusMap.pending || 0) + (statusMap.skipped || 0),
    pending: statusMap.pending || 0,
    sent: statusMap.sent || 0,
    delivered: statusMap.delivered || 0,
    read: statusMap.read || 0,
    failed: statusMap.failed || 0,
    skipped: statusMap.skipped || 0,
    blocked: statusMap.blocked || 0,
  };

  const isComplete = finalStats.pending === 0;

  await crmDb.collection('broadcast_runs').updateOne(
    { _id: run._id },
    { 
      $set: { 
        stats: finalStats,
        status: isComplete ? 'completed' : 'running',
        ...(isComplete ? { completedAt: new Date() } : {})
      } 
    }
  );

  console.log(`\n📊 Results: Sent: ${sent}, Failed: ${failed}`);
  console.log('Final stats:', finalStats);

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
