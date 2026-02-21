require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  console.log('Date range:', currentMonthStart.toISOString(), 'to', currentMonthEnd.toISOString());
  
  // NEW LOGIC: Aggregate marketing costs from ALL Meta templates sent (with waMessageId)
  const result = await mongoose.connection.db.collection('whatsapp_messages').aggregate([
    {
      $match: {
        messageType: 'template',
        direction: 'outbound',
        provider: 'meta',
        $or: [
          { 'metadata.cost': { $exists: true, $gt: 0 } },
          { waMessageId: { $exists: true, $ne: null, $regex: /^wamid\./ } },
        ],
        sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      },
    },
    {
      $group: {
        _id: null,
        // Use metadata.cost if available, otherwise estimate ₹0.70 per message
        total: { $sum: { $ifNull: ['$metadata.cost', 0.70] } },
        count: { $sum: 1 },
      },
    },
  ]).toArray();
  
  console.log('\nTemplate marketing cost this month (updated logic):');
  console.log('Total:', result[0]?.total?.toFixed(2) || 0, 'INR');
  console.log('Count:', result[0]?.count || 0, 'messages');
  
  // Check individual messages
  const msgs = await mongoose.connection.db.collection('whatsapp_messages').find({
    messageType: 'template',
    direction: 'outbound',
    provider: 'meta',
    sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    waMessageId: { $exists: true, $ne: null, $regex: /^wamid\./ },
  }).limit(10).toArray();
  
  console.log('\nRecent Meta template messages:');
  msgs.forEach(m => {
    console.log('-', m.metadata?.template?.templateName || 'unknown', '|', m.status, '| Cost:', m.metadata?.cost || '(0.70 estimate)', '| ID:', m.waMessageId?.substring(0, 20));
  });
  
  await mongoose.disconnect();
}
check();
