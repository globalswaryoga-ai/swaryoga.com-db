require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const crmDb = client.db('swaryoga_admin_crm');

  // Check leads by source
  const sources = await crmDb.collection('leads').aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('=== Lead Sources ===');
  sources.forEach(s => console.log(`  ${s._id || 'null'}: ${s.count}`));

  // Check for leads that have form-signup label but no source
  const formLeads = await crmDb.collection('leads').find({ labels: 'form-signup' }).toArray();
  console.log('\nForm-signup labeled leads:', formLeads.length);

  // Check leads that might be from Meta but not tagged
  const metaLeads = await crmDb.collection('leads').find({ 
    $or: [
      { source: 'meta_leadgen' },
      { source: 'facebook' },
      { source: 'instagram' },
      { 'metadata.source': { $regex: /meta|facebook|instagram/i } }
    ]
  }).toArray();
  console.log('Meta/Facebook/Instagram leads:', metaLeads.length);
  metaLeads.forEach(l => console.log('  ', l.name, '|', l.phoneNumber, '|', l.source));

  // Show total lead count
  const total = await crmDb.collection('leads').countDocuments();
  console.log('\nTotal leads:', total);

  // Check what phone numbers in swaryogaDB.users are NOT in leads
  const mainDb = client.db('swaryogaDB');
  const users = await mainDb.collection('users').find({}).toArray();
  const leadPhones = new Set((await crmDb.collection('leads').find({}, { projection: { phoneNumber: 1 } }).toArray()).map(l => l.phoneNumber));
  
  let missing = 0;
  for (const u of users) {
    let phone = (u.phone || u.phoneNumber || u.mobile || '').replace(/[\s+\-()]/g, '').replace(/^0+/, '');
    if (!phone || phone === '-') continue;
    if (/^\d{10}$/.test(phone)) phone = '91' + phone;
    if (!leadPhones.has(phone)) {
      console.log('  MISSING:', u.name, '|', phone, '|', u.email);
      missing++;
    }
  }
  console.log('\nUsers NOT in leads:', missing);

  await client.close();
}

main().catch(console.error);
