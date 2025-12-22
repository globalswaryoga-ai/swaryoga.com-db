require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swaryoga';
    console.log('🔄 Connecting to MongoDB...');
    console.log(`   URI: ${uri.substring(0, 50)}...\n`);
    
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const count = await db.collection('workshopschedules').countDocuments();
    console.log(`📊 Total schedules in database: ${count}\n`);

    const doc = await db.collection('workshopschedules').findOne({
      workshopSlug: 'basic-swar-yoga',
      mode: 'online',
      language: 'Hindi'
    });

    if (doc) {
      console.log('✅ Schedule found!\n');
      console.log('📋 Details:');
      console.log(`   ID: ${doc._id}`);
      console.log(`   Workshop: ${doc.workshopName}`);
      console.log(`   Language: ${doc.language}`);
      console.log(`   Mode: ${doc.mode}`);
      console.log(`   Dates: ${doc.startDate.toISOString().split('T')[0]} to ${doc.endDate.toISOString().split('T')[0]}`);
      console.log(`   Time: ${doc.time}`);
      console.log(`   Capacity: ${doc.seatsTotal}`);
      console.log(`   Price: ₹${doc.price} ${doc.currency}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Created: ${doc.createdAt}`);
    } else {
      console.log('❌ Schedule not found');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
