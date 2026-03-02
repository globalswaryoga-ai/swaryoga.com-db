const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkDB() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  const conn = await mongoose.connect(uri);
  
  // Check swaryogaDB
  const mainDb = conn.connection.db;
  const mainStats = await mainDb.stats();
  console.log('=== swaryogaDB ===');
  console.log('Data size:', (mainStats.dataSize / 1024 / 1024).toFixed(2), 'MB');
  console.log('Storage size:', (mainStats.storageSize / 1024 / 1024).toFixed(2), 'MB');
  console.log('Index size:', (mainStats.indexSize / 1024 / 1024).toFixed(2), 'MB');
  
  const collections = await mainDb.listCollections().toArray();
  console.log('\nCollections (sorted by size):');
  const colStats = [];
  for (const col of collections) {
    try {
      const stats = await mainDb.collection(col.name).stats();
      colStats.push({
        name: col.name,
        dataMB: (stats.size / 1024 / 1024).toFixed(2),
        storageMB: (stats.storageSize / 1024 / 1024).toFixed(2),
        count: stats.count || 0
      });
    } catch(e) {}
  }
  colStats.sort((a, b) => parseFloat(b.storageMB) - parseFloat(a.storageMB));
  for (const s of colStats) {
    console.log(`  ${s.name}: ${s.dataMB} MB data, ${s.storageMB} MB storage, ${s.count} docs`);
  }

  // Check CRM DB
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  const crmDb = conn.connection.client.db(crmDbName);
  const crmStats = await crmDb.stats();
  console.log('\n=== ' + crmDbName + ' ===');
  console.log('Data size:', (crmStats.dataSize / 1024 / 1024).toFixed(2), 'MB');
  console.log('Storage size:', (crmStats.storageSize / 1024 / 1024).toFixed(2), 'MB');
  console.log('Index size:', (crmStats.indexSize / 1024 / 1024).toFixed(2), 'MB');

  const crmCollections = await crmDb.listCollections().toArray();
  console.log('\nCollections (sorted by size):');
  const crmColStats = [];
  for (const col of crmCollections) {
    try {
      const stats = await crmDb.collection(col.name).stats();
      crmColStats.push({
        name: col.name,
        dataMB: (stats.size / 1024 / 1024).toFixed(2),
        storageMB: (stats.storageSize / 1024 / 1024).toFixed(2),
        count: stats.count || 0
      });
    } catch(e) {}
  }
  crmColStats.sort((a, b) => parseFloat(b.storageMB) - parseFloat(a.storageMB));
  for (const s of crmColStats) {
    console.log(`  ${s.name}: ${s.dataMB} MB data, ${s.storageMB} MB storage, ${s.count} docs`);
  }

  // List ALL databases on the cluster
  const admin = conn.connection.client.db('admin');
  const dbs = await admin.admin().listDatabases();
  console.log('\n=== ALL DATABASES ON CLUSTER ===');
  for (const db of dbs.databases) {
    console.log(`  ${db.name}: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
  }
  console.log('Total cluster:', (dbs.totalSize / 1024 / 1024).toFixed(2), 'MB');

  await mongoose.disconnect();
}
checkDB().catch(e => { console.error(e.message); process.exit(1); });
