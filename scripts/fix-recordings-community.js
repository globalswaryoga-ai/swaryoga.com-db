const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const db = c.db('swaryogaDB');
  const col = db.collection('communityvideos');

  // Step 1: Backup all 7 recordings
  const recordings = await col.find({ communityId: 'swar-yoga' }).toArray();
  console.log(`=== Backup: ${recordings.length} recordings ===`);
  console.log(JSON.stringify(recordings, null, 2));

  // Step 2: Update communityId from swar-yoga to swar-yoga-l1
  const result = await col.updateMany(
    { communityId: 'swar-yoga' },
    { $set: { communityId: 'swar-yoga-l1' } }
  );
  console.log(`\n=== Migration ===`);
  console.log(`Updated ${result.modifiedCount} recordings: swar-yoga -> swar-yoga-l1`);

  // Verify
  const verify = await col.find({}).toArray();
  console.log(`\n=== Verify ===`);
  verify.forEach(v => console.log(`  ${v.communityId} | ${v.title}`));

  await c.close();
})();
