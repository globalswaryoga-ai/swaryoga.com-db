#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║      COMPLETE MESSAGE ROUTING AUDIT        ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  const leads = await db.collection('leads').find({}).toArray();
  const messages = await db.collection('whatsappmessages').find({}).toArray();
  
  console.log('LEADS:\n');
  leads.forEach(lead => {
    console.log('👤 ' + lead.phoneNumber);
    console.log('   ID: ' + lead._id);
    console.log('   Source: ' + (lead.source || 'unknown'));
    
    const leadMessages = messages.filter(m => m.leadId?.toString() === lead._id.toString());
    console.log('   Messages: ' + leadMessages.length);
    
    leadMessages.forEach(m => {
      console.log('     - ' + (m.messageContent || m.messageType) + ' (' + m.waMessageId + ')');
    });
    console.log('');
  });
  
  console.log('\n⚠️  ORPHANED MESSAGES (no lead):\n');
  const orphaned = messages.filter(m => !m.leadId || !leads.find(l => l._id.toString() === m.leadId?.toString()));
  if (orphaned.length === 0) {
    console.log('✅ None - all messages have valid leads\n');
  } else {
    orphaned.forEach(m => {
      console.log('🚫 Phone: ' + m.phoneNumber);
      console.log('   Content: ' + (m.messageContent || m.messageType));
      console.log('   LeadId: ' + (m.leadId || 'NONE'));
      console.log('');
    });
  }
  
  await mongoose.connection.close();
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
