#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkStorage() {
  try {
    console.log('Checking QR message storage...\n');
    
    const uri = process.env.MONGODB_URI_MAIN || 'mongodb://localhost:27017/swaryoga_admin_crm';
    await mongoose.connect(uri);
    
    const db = mongoose.connection.db;
    const QrMsg = db.collection('qr_whatsapp_messages');
    
    // Check all messages for contact 9075358557
    console.log('1️⃣ Messages for contact 9075358557 (any format):');
    const msgs = await QrMsg.find({
      $or: [
        { chatJid: /9075358557/ },
        { from: /9075358557/ },
        { participant: /9075358557/ }
      ]
    }).limit(5).toArray();
    
    console.log(`   Found: ${msgs.length} messages`);
    if (msgs.length > 0) {
      msgs.forEach((m, i) => {
        console.log(`   [${i+1}] userId=${m.userId}, chatJid=${m.chatJid}, text=${m.text?.substring(0,30)}`);
      });
    }
    
    console.log('\n2️⃣ Count by userId:');
    const byUserId = await QrMsg.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]).toArray();
    
    byUserId.forEach(u => {
      console.log(`   ${u._id}: ${u.count} messages`);
    });
    
    console.log('\n3️⃣ Unique chatJid formats:');
    const jids = await QrMsg.distinct('chatJid');
    console.log(`   Found ${jids.length} unique JIDs`);
    jids.slice(0, 5).forEach(j => {
      console.log(`   - ${j}`);
    });
    
    console.log('\n4️⃣ Sample recent messages:');
    const recent = await QrMsg.find({}).sort({ timestamp: -1 }).limit(3).toArray();
    recent.forEach((m, i) => {
      console.log(`   [${i+1}] userId=${m.userId}, from=${m.from}, text=${m.text?.substring(0,30)}, timestamp=${new Date(m.timestamp)}`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkStorage();
