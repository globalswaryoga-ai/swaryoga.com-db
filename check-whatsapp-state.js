const mongoose = require('mongoose');
require('dotenv').config();

async function checkState() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('\n�� WHATSAPP SYSTEM STATE CHECK\n');
    
    // Check WhatsAppMessage collection
    const messageCount = await db.collection('whatsappmessages').countDocuments();
    console.log(`✅ WhatsAppMessage count: ${messageCount}`);
    
    if (messageCount > 0) {
      const sample = await db.collection('whatsappmessages').findOne();
      console.log('   Sample message fields:', Object.keys(sample).sort());
    }
    
    // Check Conversation collection
    const convCount = await db.collection('conversations').countDocuments();
    console.log(`✅ Conversation count: ${convCount}`);
    
    if (convCount > 0) {
      const sample = await db.collection('conversations').findOne();
      console.log('   Sample conversation fields:', Object.keys(sample).sort());
    }
    
    // Check for duplicates
    const pipeline = [
      {
        $group: {
          _id: { phoneNumber: '$phoneNumber', sentAt: '$sentAt', messageContent: '$messageContent' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ];
    
    const duplicates = await db.collection('whatsappmessages').aggregate(pipeline).toArray();
    console.log(`\n⚠️  Duplicate messages found: ${duplicates.length}`);
    if (duplicates.length > 0) {
      duplicates.slice(0, 3).forEach(d => {
        console.log(`   - Phone: ${d._id.phoneNumber}, Count: ${d.count}`);
      });
    }
    
    // Check incoming messages (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const incomingLast24 = await db.collection('whatsappmessages').countDocuments({
      direction: 'inbound',
      sentAt: { $gte: yesterday }
    });
    console.log(`\n📨 Incoming messages (last 24h): ${incomingLast24}`);
    
    // Check for unread tracking
    const unreadCount = await db.collection('whatsappmessages').countDocuments({
      direction: 'inbound',
      isRead: { $ne: true }
    });
    console.log(`📌 Unread messages: ${unreadCount}`);
    
    console.log('\n✅ Diagnosis complete.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkState();
