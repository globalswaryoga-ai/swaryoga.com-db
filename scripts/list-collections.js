require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');
    const collections = await db.listCollections().toArray();
    
    console.log('Collections in swaryogaDB:');
    collections.forEach(c => console.log(`  - ${c.name}`));
    
    if (collections.find(c => c.name === 'recorded_courses')) {
      const count = await db.collection('recorded_courses').countDocuments();
      console.log(`\nrecorded_courses: ${count} documents`);
    }
    
    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
