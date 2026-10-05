const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test');
  const accounts = await db.collection('socialmediaaccounts').find({}).toArray();
  console.log(JSON.stringify(accounts, null, 2));
  await client.close();
}
run();
