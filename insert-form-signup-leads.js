/**
 * Insert old form-signup leads directly into the CRM leads collection.
 * Run: node insert-form-signup-leads.js
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const LEADS = [
  { name: 'lokhari Pandey', email: 'lokhari.pandey47@gmail.com', phoneNumber: '9779847216413', country: 'Nepal', state: 'Lumbini Pradesh', gender: 'male', age: 43, occupation: 'Business' },
  { name: 'prateek nawange', email: 'prateek.nawange@gmail.com', phoneNumber: '919407250777', country: 'India', state: 'Madhya Pradesh', gender: 'male', age: 41, occupation: 'Business' },
  { name: 'Jitendra Rahatade', email: 'jiten.rah@gmail.com', phoneNumber: '919820281516', country: 'India', state: 'Maharashtra', gender: 'male', age: 56, occupation: 'Business' },
  { name: 'Smita Suhas Aher', email: 'smitaaher1976@gmail.com', phoneNumber: '919423784888', country: 'India', state: 'Maharashtra', gender: 'female', age: 49, occupation: 'Housewife' },
  { name: 'Rupali Bharambe', email: 'rupalinarkhedel8@gmail.com', phoneNumber: '918888889078', country: 'India', state: 'Maharashtra', gender: 'female', age: 38, occupation: 'House wife' },
  { name: 'Geeta Arora', email: 'geetamattaarora@gmail.com', phoneNumber: '918168517072', country: 'India', state: 'Haryana', gender: 'female', age: 57, occupation: 'Service' },
  { name: 'Dhanish Rawat', email: 'rd4597564@gmail.com', phoneNumber: '919729530513', country: 'India', state: 'Haryana', gender: 'male', age: 57, occupation: 'Govt' },
  { name: 'Rashmi Kolhe', email: 'rasshmiekolhe@gmail.com', phoneNumber: '917738093173', country: 'India', state: 'Maharashtra', gender: 'female', age: 48, occupation: 'Corporate job' },
  { name: 'Mantu Chauhan', email: 'mantuetw@gmail.com', phoneNumber: '919368675024', country: 'India', state: 'Uttar Pradesh', gender: 'male', age: 53, occupation: 'Farmer' },
];

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) { console.error('No MONGODB_URI found in .env.local'); process.exit(1); }

  const crmDb = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  console.log(`Connecting to ${crmDb}...`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(crmDb);
  const leadsCol = db.collection('leads');

  // Get next lead number
  const countersCol = db.collection('crm_counters');
  let counterDoc = await countersCol.findOne({ _id: 'leadNumber' });
  let nextSeq = counterDoc ? counterDoc.seq + 1 : 1;

  let inserted = 0;
  let skipped = 0;

  for (const lead of LEADS) {
    // Check if phone already exists
    const existing = await leadsCol.findOne({ phoneNumber: lead.phoneNumber });
    if (existing) {
      console.log(`  SKIP: ${lead.name} (${lead.phoneNumber}) — already exists as "${existing.name}"`);
      skipped++;
      continue;
    }

    const leadNumber = String(nextSeq).padStart(6, '0');
    const doc = {
      name: lead.name,
      phoneNumber: lead.phoneNumber,
      email: lead.email,
      source: 'website-signup',
      status: 'lead',
      labels: ['form-signup'],
      leadNumber,
      metadata: {
        country: lead.country,
        state: lead.state,
        gender: lead.gender,
        age: lead.age,
        occupation: lead.occupation,
        importedAt: new Date().toISOString(),
        importSource: 'form-signup-manual',
      },
      chatStatus: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await leadsCol.insertOne(doc);
    console.log(`  ✅ Inserted: ${lead.name} (${lead.phoneNumber}) — Lead #${leadNumber}`);
    nextSeq++;
    inserted++;
  }

  // Update counter
  if (inserted > 0) {
    await countersCol.updateOne(
      { _id: 'leadNumber' },
      { $set: { seq: nextSeq - 1 } },
      { upsert: true }
    );
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped (duplicate): ${skipped}`);
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
