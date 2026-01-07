#!/usr/bin/env node
/**
 * Test if direct MongoDB collection writes work where Mongoose models don't
 */

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  console.log('\n🧪 Testing direct collection write\n');
  
  await mongoose.connect(process.env.MONGODB_URI);
  
  const mainDb = mongoose.connection.db;  // Get the main database directly
  
  // Try direct collection write
  const testId = 'DIRECT_TEST_' + Date.now();
  console.log('Writing directly to collection:', testId);
  
  try {
    const result = await mainDb.collection('whatsappmessages').updateOne(
      { waMessageId: testId },
      {
        $setOnInsert: {
          waMessageId: testId,
          phoneNumber: '9999999999',
          direction: 'test',
          messageContent: 'Direct write test',
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    
    console.log('✅ Direct write result:');
    console.log('  matched:', result.matchedCount);
    console.log('  upserted:', result.upsertedCount);
    console.log('  modified:', result.modifiedCount);
    
    // Verify
    const doc = await mainDb.collection('whatsappmessages').findOne({ waMessageId: testId });
    if (doc) {
      console.log('✅ Document found:', doc._id);
    } else {
      console.log('❌ Document NOT found after write!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  console.log('\n');
  await mongoose.connection.close();
})();
