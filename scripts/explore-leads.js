#!/usr/bin/env node
// Explore leads collection: workshop names + counts + sample names
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) { console.error('No Mongo URI'); process.exit(1); }
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const leads = db.collection('leads');

  const total = await leads.countDocuments();
  console.log('TOTAL LEADS:', total);

  // Count by workshopName (top-level)
  const byWs = await leads.aggregate([
    { $group: { _id: '$workshopName', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log('\n=== by workshopName ===');
  byWs.forEach(w => console.log(`${(w.count+'').padStart(5)}  ${JSON.stringify(w._id)}`));

  // Count by workshops[] array entries
  const byWsArr = await leads.aggregate([
    { $unwind: { path: '$workshops', preserveNullAndEmptyArrays: false } },
    { $group: { _id: '$workshops', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log('\n=== by workshops[] array ===');
  byWsArr.forEach(w => console.log(`${(w.count+'').padStart(5)}  ${JSON.stringify(w._id)}`));

  // Sample doc shape
  const sample = await leads.findOne({ name: { $exists: true, $ne: '' } });
  console.log('\n=== sample lead keys ===');
  console.log(sample ? Object.keys(sample).join(', ') : 'none');
  if (sample) console.log('sample name/phone/workshop:', JSON.stringify({name: sample.name, phoneNumber: sample.phoneNumber, workshopName: sample.workshopName, workshops: sample.workshops}));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
