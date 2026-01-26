/**
 * Cleanup Script for QR WhatsApp Messages
 * 
 * This script:
 * 1. Finds messages with invalid phone numbers (timestamps, etc.)
 * 2. Attempts to recover the correct phone from leadId
 * 3. Removes orphaned messages with no valid phone
 * 4. Fixes leads with invalid phone numbers
 * 5. Links messages to leads where possible
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Phone validation: must be 10-15 digits and NOT look like a timestamp
function isValidPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  // Timestamps typically start with 17... and are 13 digits
  if (digits.length === 13 && digits.startsWith('17')) return false;
  // Valid phone: 10-15 digits
  return digits.length >= 10 && digits.length <= 15;
}

async function cleanupQRMessages() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;
  
  console.log('\n========================================');
  console.log('QR WhatsApp Messages Cleanup Script');
  console.log('========================================\n');

  const messagesCol = db.collection('whatsapp_messages');
  const leadsCol = db.collection('leads');
  
  // 1. Find all QR messages
  const qrMessages = await messagesCol.find({
    $or: [
      { provider: 'whatsapp_web_bridge' },
      { provider: 'whatsapp_qr' }
    ]
  }).toArray();
  
  console.log(`Total QR messages: ${qrMessages.length}`);
  
  // 2. Identify messages with invalid phone numbers (including timestamps)
  const invalidPhoneMessages = qrMessages.filter(m => !isValidPhone(m.phoneNumber));
  
  console.log(`Messages with invalid phone numbers: ${invalidPhoneMessages.length}`);
  
  // 3. Try to recover phone from leadId
  let recovered = 0;
  let deleted = 0;
  
  for (const msg of invalidPhoneMessages) {
    if (msg.leadId) {
      const lead = await leadsCol.findOne({ _id: msg.leadId });
      if (lead && lead.phoneNumber) {
        const leadPhone = String(lead.phoneNumber).replace(/\D/g, '');
        if (leadPhone.length >= 10 && leadPhone.length <= 15) {
          // Recover phone from lead
          await messagesCol.updateOne(
            { _id: msg._id },
            { $set: { phoneNumber: leadPhone } }
          );
          console.log(`  ✅ Recovered phone for message ${msg._id}: ${msg.phoneNumber} -> ${leadPhone}`);
          recovered++;
          continue;
        }
      }
    }
    
    // Cannot recover - delete orphaned message
    await messagesCol.deleteOne({ _id: msg._id });
    console.log(`  🗑️ Deleted orphaned message ${msg._id} (phone: ${msg.phoneNumber})`);
    deleted++;
  }
  
  console.log(`\nRecovered: ${recovered}, Deleted: ${deleted}`);
  
  // 4. Find and fix leads with invalid phone numbers
  console.log('\n--- Checking Leads ---');
  const allLeads = await leadsCol.find({}).toArray();
  const invalidLeads = allLeads.filter(l => !isValidPhone(l.phoneNumber));
  
  console.log(`Leads with invalid phone numbers: ${invalidLeads.length}`);
  
  for (const lead of invalidLeads) {
    // Check if lead has any valid messages
    const msgCount = await messagesCol.countDocuments({ leadId: lead._id });
    if (msgCount === 0) {
      // No messages - safe to delete
      await leadsCol.deleteOne({ _id: lead._id });
      console.log(`  🗑️ Deleted lead ${lead._id} (phone: ${lead.phoneNumber}, name: ${lead.name})`);
    } else {
      console.log(`  ⚠️ Lead ${lead._id} has ${msgCount} messages, keeping (phone: ${lead.phoneNumber})`);
    }
  }
  
  // 5. Find messages without leadId
  console.log('\n--- Messages without leadId ---');
  const noLeadMessages = await messagesCol.find({
    leadId: { $in: [null, undefined] },
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  }).toArray();
  
  console.log(`Messages without leadId: ${noLeadMessages.length}`);
  
  let linked = 0;
  let deletedOrphans = 0;
  for (const msg of noLeadMessages) {
    const phone = String(msg.phoneNumber || '').replace(/\D/g, '');
    if (isValidPhone(phone)) {
      const lead = await leadsCol.findOne({ phoneNumber: phone });
      if (lead) {
        await messagesCol.updateOne(
          { _id: msg._id },
          { $set: { leadId: lead._id } }
        );
        console.log(`  ✅ Linked message ${msg._id} to lead ${lead._id}`);
        linked++;
      } else {
        // Valid phone but no lead - delete orphaned message
        await messagesCol.deleteOne({ _id: msg._id });
        console.log(`  🗑️ Deleted orphan (no lead found): ${msg._id} phone=${phone}`);
        deletedOrphans++;
      }
    } else {
      // Invalid phone - delete
      await messagesCol.deleteOne({ _id: msg._id });
      console.log(`  🗑️ Deleted orphan (invalid phone): ${msg._id} phone=${phone}`);
      deletedOrphans++;
    }
  }
  
  console.log(`\nLinked to leads: ${linked}, Deleted orphans: ${deletedOrphans}`);
  
  // 6. Summary
  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Total QR messages: ${qrMessages.length}`);
  console.log(`Invalid phone messages found: ${invalidPhoneMessages.length}`);
  console.log(`  - Recovered: ${recovered}`);
  console.log(`  - Deleted: ${deleted}`);
  console.log(`Invalid leads found: ${invalidLeads.length}`);
  console.log(`Messages linked to leads: ${linked}`);
  
  await mongoose.disconnect();
  console.log('\n✅ Cleanup complete!');
}

cleanupQRMessages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
