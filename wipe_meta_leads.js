const { MongoClient } = require('mongodb');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const uriLine = envContent.split('\n').find(l => l.startsWith('MONGODB_URI='));
  if (!uriLine) throw new Error('MONGODB_URI not found');
  const uri = uriLine.split('=')[1].trim();

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const result = await db.collection('bunny_leads').deleteMany({ source: 'meta_instant_form' });
  console.log('Deleted Meta Leads:', result.deletedCount);
  await client.close();
}
run().catch(console.error);
