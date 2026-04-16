#!/usr/bin/env node
/**
 * Test MongoDB Atlas connection
 */

require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ No MongoDB URI found in .env.local');
  process.exit(1);
}

console.log('🔍 MongoDB URI:', uri.substring(0, 60) + '...');
console.log('⏳ Testing connection (5s timeout)...\n');

const { MongoClient } = require('mongodb');
const startTime = Date.now();

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  retryWrites: true,
});

client
  .connect()
  .then(async () => {
    const elapsed = Date.now() - startTime;
    console.log(`✅ MongoDB connection SUCCESSFUL! (${elapsed}ms)`);

    // Test ping
    const adminDb = client.db().admin();
    const pingResult = await adminDb.ping();
    console.log(`✅ Ping response: ${pingResult.ok === 1 ? 'OK' : 'Check'}`);

    // List databases
    const adminDbs = await adminDb.listDatabases();
    console.log(
      `✅ Available databases: ${adminDbs.databases.map((d) => d.name).join(', ')}`
    );

    await client.close();
    console.log('\n✨ All checks passed! Whitelist is working correctly.');
    process.exit(0);
  })
  .catch((err) => {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Connection FAILED (${elapsed}ms)`);
    console.error(`   Error: ${err.message}`);
    console.error(`   Code: ${err.code}`);

    if (
      err.message.includes('whitelist') ||
      err.message.includes('ENOTFOUND') ||
      err.message.includes('getaddrinfo')
    ) {
      console.error(
        '\n⚠️  ISSUE: IP whitelist NOT updated or still propagating\n'
      );
      console.error('   Steps:');
      console.error('   1. Go to: https://cloud.mongodb.com/v2');
      console.error('   2. Select cluster: swaryogadb');
      console.error('   3. Click tab: Network Access');
      console.error('   4. Click button: ADD IP ADDRESS');
      console.error('   5. Enter: 0.0.0.0/0 (or Vercel IPs)');
      console.error('   6. Click: CONFIRM');
      console.error('   7. Wait 5-10 minutes for propagation');
      console.error('   8. Run this test again');
    }

    process.exit(1);
  });
