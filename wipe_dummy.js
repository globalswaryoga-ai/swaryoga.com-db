const { MongoClient } = require('mongodb');
require('dotenv').config({path: '.env.local'});
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('swaryoga_crm');
  await db.collection('workshops').updateMany({}, { $unset: { "metadata.dummyFormConfig": "" } });
  console.log("Wiped dummy configs!");
  process.exit(0);
}
run();
