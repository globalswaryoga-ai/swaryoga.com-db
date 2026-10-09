const { MongoClient } = require('mongodb');
require('dotenv').config({path: '.env.local'});
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('swaryoga_crm');
  const leads = await db.collection('leads').find({ source: 'meta_instant_form' }).toArray();
  console.log("Total meta leads:", leads.length);
  if (leads.length > 0) {
      console.log("Latest lead:", JSON.stringify(leads[leads.length - 1], null, 2));
  }
  process.exit(0);
}
run();
