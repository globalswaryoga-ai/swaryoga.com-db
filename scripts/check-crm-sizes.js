const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);

  // CRM DB collections
  const crmDb = mongoose.connection.client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const cols = await crmDb.listCollections().toArray();
  console.log('=== CRM DB Collections ===');
  for (const c of cols) {
    try {
      const s = await crmDb.collection(c.name).stats();
      const mb = (s.size / 1024 / 1024).toFixed(2);
      const st = (s.storageSize / 1024 / 1024).toFixed(2);
      console.log(c.name + ': ' + mb + ' MB data, ' + st + ' MB stor, ' + s.count + ' docs');
    } catch (e) { /* skip */ }
  }

  // All DBs
  const admin = mongoose.connection.client.db('admin');
  const dbs = await admin.admin().listDatabases();
  console.log('\n=== ALL DBs ===');
  for (const d of dbs.databases) {
    console.log(d.name + ': ' + (d.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB');
  }
  console.log('TOTAL: ' + (dbs.totalSize / 1024 / 1024).toFixed(2) + ' MB');

  process.exit(0);
})();
