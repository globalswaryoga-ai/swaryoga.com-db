const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  
  const cols = await db.listCollections().toArray();
  const videoCollections = cols.filter(c => 
    c.name.toLowerCase().includes('video') || c.name.toLowerCase().includes('playlist')
  );
  console.log('Video/Playlist collections:', videoCollections.map(c => c.name));

  const count = await db.collection('videoplaylists').countDocuments();
  console.log('videoplaylists count:', count);

  if (count > 0) {
    const sample = await db.collection('videoplaylists').find({}).limit(3).toArray();
    console.log('Sample playlists:', JSON.stringify(sample, null, 2));
  }

  for (const col of videoCollections) {
    const cnt = await db.collection(col.name).countDocuments();
    console.log(col.name + ' count:', cnt);
    if (cnt > 0 && cnt < 10) {
      const docs = await db.collection(col.name).find({}).limit(3).toArray();
      console.log('  Sample:', JSON.stringify(docs.map(d => ({ _id: d._id, name: d.name, status: d.status, type: d.type })), null, 2));
    }
  }

  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
