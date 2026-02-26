const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');

  const count = await col.countDocuments();
  console.log('Total documents in tally_manual_balances:', count);
  
  const fys = await col.distinct('fy');
  console.log('FY values:', fys);
  
  // Check with financialYear field too
  const fys2 = await col.distinct('financialYear');
  console.log('financialYear values:', fys2);

  // Get sample document
  const sample = await col.findOne();
  if (sample) {
    console.log('\nSample doc keys:', Object.keys(sample));
    console.log('Sample:', JSON.stringify(sample, null, 2));
  } else {
    console.log('NO DOCUMENTS FOUND!');
  }

  // Check all collections 
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\nAll collections:', collections.map(c => c.name).filter(n => n.includes('tally')));

  await mongoose.disconnect();
}
check();
