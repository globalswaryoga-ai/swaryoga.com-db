const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryoga_admin_crm');
  const db = mongoose.connection.db;
  const ObjectId = mongoose.Types.ObjectId;
  
  console.log('🔍 CHECKING WHY MESSAGES NOT SHOWING IN INBOX\n');
  
  // Check lead by ID from the message
  console.log('1. Checking lead ID from message (695f64d589a6d26818e041c6):');
  const lead = await db.collection('leads').findOne({ _id: new ObjectId('695f64d589a6d26818e041c6') });
  if (lead) {
    console.log('   ✅ Lead found - Phone:', lead.phone, '| Name:', lead.firstName);
  } else {
    console.log('   ❌ Lead NOT FOUND - This is why messages dont show!');
  }
  
  // Check leads with phone 919309986820
  console.log('\n2. Leads with phone 919309986820:');
  const leads = await db.collection('leads').find({ phone: /9309986820/ }).toArray();
  if (leads.length === 0) {
    console.log('   ❌ No leads with this phone number');
  } else {
    leads.forEach(l => console.log('   ✅', l._id.toString(), l.phone, l.firstName));
  }
  
  // Check orphaned messages (messages without valid lead)
  console.log('\n3. Checking for orphaned messages:');
  const msgs = await db.collection('whatsapp_messages').find({ direction: 'inbound' }).limit(10).toArray();
  let orphaned = 0;
  for (const m of msgs) {
    if (m.leadId) {
      const leadExists = await db.collection('leads').findOne({ _id: new ObjectId(m.leadId) });
      if (!leadExists) {
        orphaned++;
        console.log('   ❌ Orphaned:', m.phoneNumber, '-> leadId', m.leadId, 'NOT FOUND');
      }
    }
  }
  console.log('   Orphaned messages in sample:', orphaned);
  
  // Check provider filter issue
  console.log('\n4. Message providers in database:');
  const providers = await db.collection('whatsapp_messages').distinct('provider');
  console.log('   Providers:', providers);
  
  // Total counts
  console.log('\n5. Total counts:');
  console.log('   Total leads:', await db.collection('leads').countDocuments());
  console.log('   Total messages:', await db.collection('whatsapp_messages').countDocuments());
  
  await mongoose.disconnect();
}

check().catch(console.error);
