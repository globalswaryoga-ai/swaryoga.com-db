require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

if (!uri) {
  console.error('❌ Missing MONGODB_URI_MAIN (or MONGODB_URI)');
  process.exit(2);
}

(async () => {
  try {
    console.log(`🔌 Connecting (db=${dbName})...`);
    const t0 = Date.now();
    await mongoose.connect(uri, {
      dbName,
      // Keep these tight to fail fast; Atlas issues shouldn't hang scripts.
      serverSelectionTimeoutMS: 12000,
      connectTimeoutMS: 12000,
      socketTimeoutMS: 20000,
      maxPoolSize: 3,
    });
    console.log(`✅ Connected in ${Date.now() - t0}ms`);

    const ping = await mongoose.connection.db.admin().ping();
    console.log('✅ Ping OK:', ping);

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ Connect/ping failed:', e?.message || e);
    process.exit(1);
  }
})();
