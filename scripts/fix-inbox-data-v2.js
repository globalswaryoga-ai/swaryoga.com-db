#!/usr/bin/env node
/**
 * Fix Inbox Data Issues - CORRECTED
 * Lead schema uses 'phoneNumber' not 'phone'
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function main() {
  console.log('\n🔧 FIX INBOX DATA ISSUES (CORRECTED)\n');
  console.log('='.repeat(60));
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const leadsCollection = db.collection('leads');
  const messagesCollection = db.collection('whatsapp_messages');
  
  // 1. Find leads with missing phoneNumber (CORRECT FIELD)
  console.log('\n1. LEADS WITH MISSING phoneNumber:');
  const brokenLeads = await leadsCollection.find({
    $or: [
      { phoneNumber: null },
      { phoneNumber: undefined },
      { phoneNumber: '' },
      { phoneNumber: { $exists: false } }
    ]
  }).toArray();
  
  console.log(`   Found ${brokenLeads.length} leads with missing phoneNumber`);
  for (const lead of brokenLeads.slice(0, 10)) {
    console.log(`   - ${lead._id}: name="${lead.name}", phoneNumber="${lead.phoneNumber}"`);
  }
  if (brokenLeads.length > 10) {
    console.log(`   ... and ${brokenLeads.length - 10} more`);
  }
  
  // 2. Sample good leads with phoneNumber
  console.log('\n2. SAMPLE LEADS WITH phoneNumber:');
  const goodLeads = await leadsCollection.find({
    phoneNumber: { $exists: true, $ne: null, $ne: '' }
  }).limit(5).toArray();
  
  console.log(`   Found ${await leadsCollection.countDocuments({ phoneNumber: { $exists: true, $ne: null, $ne: '' } })} leads WITH phoneNumber`);
  for (const lead of goodLeads) {
    console.log(`   - ${lead._id}: name="${lead.name}", phoneNumber="${lead.phoneNumber}"`);
  }
  
  // 3. Find unique phone numbers from messages
  console.log('\n3. UNIQUE PHONE NUMBERS IN MESSAGES:');
  const allPhones = await messagesCollection.distinct('phoneNumber');
  console.log(`   Found ${allPhones.length} unique phone numbers in messages`);
  
  // 4. Check which phones have matching leads
  console.log('\n4. PHONE MATCHING ANALYSIS:');
  const matchedPhones = [];
  const orphanedPhones = [];
  
  for (const phone of allPhones) {
    if (!phone) continue;
    
    // Try multiple phone formats
    const lead = await leadsCollection.findOne({
      $or: [
        { phoneNumber: phone },
        { phoneNumber: phone.replace(/^91/, '') },
        { phoneNumber: `91${phone}` },
        { phoneNumber: `+${phone}` },
        { phoneNumber: phone.replace(/^\+/, '') }
      ]
    });
    
    const msgCount = await messagesCollection.countDocuments({ phoneNumber: phone });
    
    if (lead) {
      matchedPhones.push({ phone, msgCount, leadId: lead._id, leadName: lead.name });
    } else {
      orphanedPhones.push({ phone, msgCount });
    }
  }
  
  console.log(`   ✅ ${matchedPhones.length} phones MATCHED to leads:`);
  for (const { phone, msgCount, leadId, leadName } of matchedPhones) {
    console.log(`      - ${phone} (${msgCount} msgs) -> ${leadName} (${leadId})`);
  }
  
  console.log(`\n   ❌ ${orphanedPhones.length} phones NOT MATCHED:`);
  for (const { phone, msgCount } of orphanedPhones) {
    console.log(`      - ${phone} (${msgCount} messages)`);
  }
  
  // 5. Check messages with leadId pointing to leads WITH phoneNumber
  console.log('\n5. MESSAGE-LEAD LINKAGE CHECK:');
  const sampleMessages = await messagesCollection.find({
    direction: 'inbound',
    leadId: { $exists: true, $ne: null }
  }).sort({ sentAt: -1 }).limit(5).toArray();
  
  for (const msg of sampleMessages) {
    try {
      const lead = await leadsCollection.findOne({ _id: new ObjectId(msg.leadId) });
      if (lead) {
        const phonesMatch = lead.phoneNumber === msg.phoneNumber;
        console.log(`   ${phonesMatch ? '✅' : '⚠️'} Msg ${msg.phoneNumber} -> Lead ${lead.name} (${lead.phoneNumber || 'NO PHONE'})`);
      } else {
        console.log(`   ❌ Msg ${msg.phoneNumber} -> Lead NOT FOUND (${msg.leadId})`);
      }
    } catch (e) {
      console.log(`   ❌ Msg ${msg.phoneNumber} -> Invalid leadId: ${msg.leadId}`);
    }
  }
  
  // 6. Check the specific problem lead 695f64d589a6d26818e041c6
  console.log('\n6. SPECIFIC LEAD CHECK (695f64d589a6d26818e041c6):');
  try {
    const problemLead = await leadsCollection.findOne({ _id: new ObjectId('695f64d589a6d26818e041c6') });
    if (problemLead) {
      console.log('   Lead found:');
      console.log(`   - name: ${problemLead.name}`);
      console.log(`   - phoneNumber: ${problemLead.phoneNumber}`);
      console.log(`   - source: ${problemLead.source}`);
      console.log(`   - status: ${problemLead.status}`);
      
      // Count messages for this lead
      const msgCount = await messagesCollection.countDocuments({ leadId: problemLead._id });
      console.log(`   - Messages linked: ${msgCount}`);
    } else {
      console.log('   ❌ Lead not found!');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  await client.close();
  console.log('\n' + '='.repeat(60));
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
