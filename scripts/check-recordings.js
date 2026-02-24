const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const db = c.db('swaryogaDB');

  // Check all recording-related collections
  const collections = await db.listCollections().toArray();
  const recColls = collections.filter(col => 
    col.name.toLowerCase().includes('record') || col.name.toLowerCase().includes('video')
  );
  console.log('Recording/Video collections:');
  recColls.forEach(col => console.log('  ' + col.name));

  // Check recordings in each collection
  for (const colInfo of recColls) {
    const col = db.collection(colInfo.name);
    const count = await col.countDocuments();
    console.log(`\n=== ${colInfo.name}: ${count} docs ===`);
    if (count > 0) {
      // Group by communityId
      const groups = await col.aggregate([
        { $group: { _id: '$communityId', count: { $sum: 1 } } }
      ]).toArray();
      groups.forEach(g => console.log(`  communityId="${g._id}": ${g.count} docs`));

      // Show all docs (limited fields)
      const docs = await col.find({}).limit(30).toArray();
      docs.forEach(d => {
        const info = {
          _id: d._id,
          communityId: d.communityId,
          title: d.title,
          folderName: d.folderName,
          playlistName: d.playlistName,
          url: d.url || d.videoUrl,
          type: d.type,
        };
        console.log('  ' + JSON.stringify(info));
      });
    }
  }

  // Also check communityrecordings
  const allColls = collections.map(c => c.name);
  console.log('\n\nAll collections with "communit":', allColls.filter(n => n.includes('communit')));

  await c.close();
})();
