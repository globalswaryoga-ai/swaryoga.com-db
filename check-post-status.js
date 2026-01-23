const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI_MAIN;

async function check() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const posts = await db.collection('communityposts').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log('📝 Recent Posts in Database:\n');
    posts.forEach((p, i) => {
      console.log(`Post ${i+1}:`);
      console.log(`  Content: "${p.content?.substring(0, 60)}..."`);
      console.log(`  Status: ${p.status || '❌ NOT SET (should default to published)'}`);
      console.log(`  Community: ${p.communityId}`);
      console.log(`  Created: ${p.createdAt}`);
      console.log(`  _id: ${p._id}\n`);
    });
    
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
}
check();
