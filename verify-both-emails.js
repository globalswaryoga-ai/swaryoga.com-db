// Verify both email addresses in the database
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN not set in .env.local');
  process.exit(1);
}

async function verifyBothEmails() {
  let client;
  try {
    console.log('🔗 Connecting to MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI);
    client = conn.connection.getClient();
    
    const db = client.db('swarsakshiDB');
    const collection = db.collection('youtubeemailverifications');
    
    const emails = ['swarsakshi9@gmail.com', 'swarsakshi9999@gmail.com'];
    
    for (const email of emails) {
      console.log(`\n📧 Processing ${email}...`);
      
      const result = await collection.findOneAndUpdate(
        { email: email.toLowerCase() },
        {
          $set: {
            email: email.toLowerCase(),
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: 'admin-script',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
      
      console.log(`   ✅ ${email} is verified`);
    }
    
    console.log('\n✅ Both emails are now verified!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await mongoose.disconnect();
    }
  }
}

verifyBothEmails();
