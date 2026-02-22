/**
 * Sync ALL form-signup users from swaryogaDB.users → swaryoga_admin_crm.leads
 * Skips users without phone, skips duplicates, skips test entries.
 * Run: node sync-signup-users-to-leads.js
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

// Normalize phone: strip spaces, +, leading 0, ensure 91 prefix for 10-digit Indian numbers
function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s+\-()]/g, '');
  if (!p || p === '-') return null;
  // Remove leading zeros
  p = p.replace(/^0+/, '');
  // If 10 digits and looks Indian, prefix 91
  if (/^\d{10}$/.test(p)) p = '91' + p;
  // Must have at least 8 digits to be a real phone
  if (p.replace(/\D/g, '').length < 8) return null;
  return p;
}

// Skip test/dummy entries
function isTestUser(u) {
  const name = (u.name || '').toLowerCase();
  const email = (u.email || '').toLowerCase();
  if (email.includes('test.com') || email.includes('@example.com')) return true;
  if (name === 'test user' || name === 'test2' || name === 'write test' || name === 'db test user') return true;
  return false;
}

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) { console.error('No MONGODB_URI in .env.local'); process.exit(1); }

  const client = new MongoClient(uri);
  await client.connect();

  const mainDb = client.db('swaryogaDB');
  const crmDb = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const leadsCol = crmDb.collection('leads');
  const countersCol = crmDb.collection('crm_counters');

  // Get all website users
  const users = await mainDb.collection('users').find({}).toArray();
  console.log(`Found ${users.length} users in swaryogaDB.users\n`);

  // Get next lead number
  let counterDoc = await countersCol.findOne({ _id: 'leadNumber' });
  let nextSeq = counterDoc ? counterDoc.seq + 1 : 1;

  let inserted = 0;
  let skipped = 0;
  let noPhone = 0;
  let testSkip = 0;

  for (const u of users) {
    // Skip test users
    if (isTestUser(u)) {
      console.log(`  TEST-SKIP: ${u.name} (${u.email})`);
      testSkip++;
      continue;
    }

    const phone = normalizePhone(u.phone || u.phoneNumber || u.mobile);
    if (!phone) {
      console.log(`  NO-PHONE: ${u.name} (${u.email})`);
      noPhone++;
      continue;
    }

    // Check if already exists in leads
    const existing = await leadsCol.findOne({ phoneNumber: phone });
    if (existing) {
      console.log(`  EXISTS: ${u.name} (${phone}) — already as "${existing.name}" #${existing.leadNumber || '-'}`);
      skipped++;
      continue;
    }

    const leadNumber = String(nextSeq).padStart(6, '0');
    const doc = {
      name: u.name || u.fullName || '',
      phoneNumber: phone,
      email: u.email || '',
      source: 'website-signup',
      status: 'lead',
      labels: ['form-signup'],
      leadNumber,
      metadata: {
        country: u.country || undefined,
        state: u.state || undefined,
        gender: u.gender || undefined,
        age: u.age || undefined,
        occupation: u.occupation || u.profession || undefined,
        importedAt: new Date().toISOString(),
        importSource: 'form-signup-sync',
        originalUserId: String(u._id),
      },
      chatStatus: 'new',
      createdAt: u.createdAt || new Date(),
      updatedAt: new Date(),
    };

    await leadsCol.insertOne(doc);
    console.log(`  ✅ INSERTED: ${u.name} (${phone}) — Lead #${leadNumber}`);
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

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Total users:   ${users.length}`);
  console.log(`Inserted:      ${inserted}`);
  console.log(`Already exist: ${skipped}`);
  console.log(`No phone:      ${noPhone}`);
  console.log(`Test skipped:  ${testSkip}`);
  console.log(`==============================`);

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
