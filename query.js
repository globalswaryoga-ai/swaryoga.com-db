const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const leads = await db.collection('bunny_leads').find({ source: 'meta_instant_form' }).toArray();
  console.log('Total Meta Leads:', leads.length);
  if (leads.length > 0) {
    console.log('First lead workshopId:', leads[0].workshopId, 'workshopName:', leads[0].workshopName);
  }
  await client.close();
}
run();
