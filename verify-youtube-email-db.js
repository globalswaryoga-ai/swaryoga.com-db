// Direct database script to verify YouTube email without going through email verification flow
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN not set in .env.local');
  process.exit(1);
}

async function verifyYoutubeEmail() {
  let client;
  try {
    console.log('🔗 Connecting to MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI);
    client = conn.connection.getClient();
    
    // Use main database where the collection already exists
    const db = client.db('swarsakshiDB');
    
    // Use the correct collection name (lowercase)
    const collection = db.collection('youtubeemailverifications');
    
    // Hardcode the email to verify
    const emailToVerify = 'swarsakshi9@gmail.com';
    
    console.log(`\n🔍 Checking verification status for: ${emailToVerify}`);
    
    const existing = await collection.findOne({ email: emailToVerify.toLowerCase() });
    
    if (existing?.isVerified) {
      console.log(`✅ ${emailToVerify} is already verified!`);
      console.log('   Verified at:', existing.verifiedAt);
      console.log('   Verified by:', existing.verifiedBy);
    } else if (existing) {
      console.log(`⏳ ${emailToVerify} has a pending verification request`);
      console.log('   Created at:', existing.createdAt);
      console.log('   Expires at:', existing.expiresAt);
    } else {
      console.log(`❌ No verification record found for ${emailToVerify}`);
    }
    
    // Now verify it
    console.log(`\n✅ Verifying ${emailToVerify}...`);
    
    const result = await collection.findOneAndUpdate(
      { email: emailToVerify.toLowerCase() },
      {
        $set: {
          email: emailToVerify.toLowerCase(),
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: 'admin-script',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    console.log(`✅ ${emailToVerify} is now verified!`);
    console.log('\nRecord details:');
    if (result.value) {
      console.log(`   Email: ${result.value.email}`);
      console.log(`   Verified: ${result.value.isVerified}`);
      console.log(`   Verified at: ${result.value.verifiedAt}`);
    }
    
    // Final check
    const verified = await collection.findOne({ email: emailToVerify.toLowerCase() });
    if (verified && verified.isVerified) {
      console.log('\n✅ SUCCESS! Email is now verified.');
      console.log('✅ You can now add YouTube recordings!');
    } else {
      console.log('\n❌ Verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await mongoose.disconnect();
    }
  }
}

verifyYoutubeEmail();
