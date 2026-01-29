const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Find the specific message
  try {
    const msg = await crmDb.collection('whatsappmessages').findOne({
      _id: new mongoose.Types.ObjectId('697b9fc6673e21449ef50100')
    });
    
    if (msg) {
      console.log('✅ Found message in CRM DB:');
      console.log('  Phone:', msg.phoneNumber);
      console.log('  Direction:', msg.direction);
      console.log('  Type:', msg.messageType);
      console.log('  Status:', msg.status);
      console.log('  Media URL:', msg.media?.url?.substring(0,60) || 'none');
    } else {
      console.log('❌ Message 697b9fc6673e21449ef50100 NOT found');
    }
  } catch (e) {
    console.log('Error finding specific message:', e.message);
  }
  
  // Also get most recent 5 messages from any date
  console.log('\nAll recent messages (any date):');
  const recent = await crmDb.collection('whatsappmessages').find({}).sort({ _id: -1 }).limit(5).toArray();
  recent.forEach(m => {
    console.log('---');
    console.log('ID:', m._id.toString());
    console.log('Phone:', m.phoneNumber);
    console.log('Provider:', m.provider);
    console.log('Direction:', m.direction);
    console.log('Type:', m.messageType);
    console.log('Media:', m.media?.url ? 'YES' : 'no');
    console.log('SentAt:', m.sentAt);
  });
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
