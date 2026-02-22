require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('swaryogaDB');

  // Check signupdatas
  const signupCount = await db.collection('signupdatas').countDocuments();
  console.log('=== signupdatas total:', signupCount, '===');
  const signups = await db.collection('signupdatas').find({}).sort({ createdAt: -1 }).toArray();
  signups.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name || s.fullName || '-'} | ${s.email || '-'} | ${s.phone || s.phoneNumber || s.mobile || '-'} | ${s.country || '-'} | ${s.state || '-'} | ${s.gender || '-'} | ${s.age || '-'} | ${s.occupation || s.profession || '-'}`);
  });

  // Check signindatas
  const signinCount = await db.collection('signindatas').countDocuments();
  console.log('\n=== signindatas total:', signinCount, '===');
  if (signinCount > 0) {
    const sample = await db.collection('signindatas').findOne({});
    console.log('Sample keys:', Object.keys(sample));
  }

  await client.close();
}

main().catch(console.error);
