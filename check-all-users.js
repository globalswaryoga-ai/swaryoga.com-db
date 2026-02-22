require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();

  // Check swaryogaDB users
  const mainDb = client.db('swaryogaDB');
  const userCount = await mainDb.collection('users').countDocuments();
  console.log('=== swaryogaDB users total:', userCount, '===');
  
  // Get all users with key fields - show name, email, phone, etc.
  const users = await mainDb.collection('users').find({}).sort({ createdAt: -1 }).toArray();
  users.forEach((u, i) => {
    const phone = u.phone || u.phoneNumber || u.mobile || u.whatsapp || '-';
    const email = u.email || '-';
    const name = u.name || u.fullName || u.firstName || '-';
    const country = u.country || u.metadata?.country || '-';
    const state = u.state || u.metadata?.state || '-';
    const gender = u.gender || u.metadata?.gender || '-';
    const age = u.age || u.metadata?.age || '-';
    const occ = u.occupation || u.profession || u.metadata?.occupation || '-';
    console.log(`${i+1}. ${name} | ${email} | ${phone} | ${country} | ${state} | ${gender} | ${age} | ${occ}`);
  });

  // Check CRM leads count
  const crmDb = client.db('swaryoga_admin_crm');
  const leadCount = await crmDb.collection('leads').countDocuments();
  console.log('\n=== CRM Leads total:', leadCount, '===');

  // Check for "mini nair" specifically anywhere
  console.log('\n=== Searching "mini" across collections ===');
  for (const colName of ['users', 'contacts', 'workshopregistrations', 'communitymembers']) {
    try {
      const found = await mainDb.collection(colName).find({ 
        $or: [
          { name: { $regex: 'mini', $options: 'i' } },
          { fullName: { $regex: 'mini', $options: 'i' } },
          { firstName: { $regex: 'mini', $options: 'i' } }
        ]
      }).toArray();
      if (found.length) {
        console.log(`  Found in ${colName}:`, found.length);
        found.forEach(f => console.log('   ', JSON.stringify(f).substring(0, 200)));
      }
    } catch(e) {}
  }

  // Also check CRM leads for mini
  const miniLeads = await crmDb.collection('leads').find({ name: { $regex: 'mini', $options: 'i' } }).toArray();
  if (miniLeads.length) {
    console.log('  Found in CRM leads:', miniLeads.length);
    miniLeads.forEach(f => console.log('   ', f.name, f.phoneNumber, f.email));
  }

  await client.close();
}

main().catch(console.error);
