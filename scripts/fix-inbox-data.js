#!/usr/bin/env node
/**
 * Fix Inbox Data Issues
 * - Find and fix leads with undefined/missing phone
 * - Re-link orphaned messages to correct leads
 * - Create leads for messages without matching leads
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function main() {
  console.log('\n🔧 FIX INBOX DATA ISSUES\n');
  console.log('='.repeat(50));
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const leadsCollection = db.collection('leads');
  const messagesCollection = db.collection('whatsapp_messages');
  
  // 1. Find leads with missing phone
  console.log('\n1. LEADS WITH MISSING PHONE:');
  const brokenLeads = await leadsCollection.find({
    $or: [
      { phone: null },
      { phone: undefined },
      { phone: '' },
      { phone: { $exists: false } }
    ]
  }).toArray();
  
  console.log(`   Found ${brokenLeads.length} leads with missing phone`);
  for (const lead of brokenLeads) {
    console.log(`   - ${lead._id}: name="${lead.name || 'undefined'}", phone="${lead.phone || 'undefined'}"`);
  }
  
  // 2. Find unique phone numbers from messages
  console.log('\n2. UNIQUE PHONE NUMBERS IN MESSAGES:');
  const allPhones = await messagesCollection.distinct('phoneNumber');
  console.log(`   Found ${allPhones.length} unique phone numbers in messages`);
  
  // 3. Check which phones don't have matching leads
  console.log('\n3. PHONES WITHOUT MATCHING LEADS:');
  const orphanedPhones = [];
  for (const phone of allPhones) {
    if (!phone) continue;
    
    const lead = await leadsCollection.findOne({
      $or: [
        { phone: phone },
        { phone: phone.replace(/^91/, '') },
        { phone: `91${phone}` }
      ]
    });
    
    if (!lead) {
      const msgCount = await messagesCollection.countDocuments({ phoneNumber: phone });
      orphanedPhones.push({ phone, msgCount });
    }
  }
  
  console.log(`   Found ${orphanedPhones.length} orphaned phones:`);
  for (const { phone, msgCount } of orphanedPhones) {
    console.log(`   - ${phone} (${msgCount} messages)`);
  }
  
  // 4. Find messages with leadId pointing to non-existent leads
  console.log('\n4. MESSAGES WITH INVALID LEAD REFERENCES:');
  const messagesWithLeadId = await messagesCollection.find({
    leadId: { $exists: true, $ne: null }
  }).limit(100).toArray();
  
  let invalidCount = 0;
  const invalidLeadIds = new Set();
  for (const msg of messagesWithLeadId) {
    try {
      const lead = await leadsCollection.findOne({ _id: new ObjectId(msg.leadId) });
      if (!lead) {
        invalidCount++;
        invalidLeadIds.add(String(msg.leadId));
      }
    } catch (e) {
      invalidCount++;
      invalidLeadIds.add(String(msg.leadId));
    }
  }
  console.log(`   Found ${invalidCount} messages referencing non-existent leads`);
  console.log(`   Invalid lead IDs: ${[...invalidLeadIds].join(', ') || 'none'}`);
  
  // 5. Show sample of recent inbound messages
  console.log('\n5. RECENT INBOUND MESSAGES (sample):');
  const recentInbound = await messagesCollection.find({
    direction: 'inbound'
  }).sort({ sentAt: -1 }).limit(5).toArray();
  
  for (const msg of recentInbound) {
    console.log(`   - ${msg.phoneNumber} | ${new Date(msg.sentAt).toISOString()} | leadId: ${msg.leadId || 'null'}`);
  }
  
  // 6. AUTO-FIX: Create leads for orphaned phones (optionally)
  console.log('\n6. AUTO-FIX OPTIONS:');
  console.log('   To fix orphaned messages, run with --fix flag');
  
  if (process.argv.includes('--fix')) {
    console.log('\n   🔧 APPLYING FIXES...\n');
    
    for (const { phone, msgCount } of orphanedPhones) {
      // Create a new lead for this phone
      const newLead = {
        name: `Unknown (${phone})`,
        phone: phone,
        source: 'whatsapp_inbound',
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await leadsCollection.insertOne(newLead);
      console.log(`   ✅ Created lead ${result.insertedId} for phone ${phone}`);
      
      // Update messages to reference this lead
      const updateResult = await messagesCollection.updateMany(
        { phoneNumber: phone, leadId: { $in: [null, undefined] } },
        { $set: { leadId: result.insertedId } }
      );
      console.log(`      Updated ${updateResult.modifiedCount} messages`);
    }
    
    console.log('\n   ✅ Fixes applied!');
  }
  
  await client.close();
  console.log('\n' + '='.repeat(50));
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
