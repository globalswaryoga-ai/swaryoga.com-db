const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collection = db.collection('whatsapp_messages');
    
    // Count messages with broadcast provider
    const broadcastMsgs = await collection.countDocuments({ provider: 'whatsapp_web_bridge' });
    console.log('Messages with provider=whatsapp_web_bridge:', broadcastMsgs);
    
    // Get the most recent one
    if (broadcastMsgs > 0) {
      const latest = await collection.findOne({ provider: 'whatsapp_web_bridge' }, { sort: { sentAt: -1 } });
      console.log('\nLatest broadcast message:');
      console.log('  To:', latest.phoneNumber);
      console.log('  Status:', latest.status);
      console.log('  Sent At:', latest.sentAt?.toISOString());
      console.log('  Provider:', latest.provider);
      console.log('  Content:', latest.messageContent?.substring(0, 60) + '...');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
