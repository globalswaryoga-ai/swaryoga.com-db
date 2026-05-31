#!/usr/bin/env node

// Lists tenants with subscription tier and enabledModules using raw MongoDB driver
// Usage: node scripts/list-tenants-raw.js

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

if (!uri) {
  console.error('MONGODB_URI_MAIN or MONGODB_URI must be set in environment');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  try {
    await client.connect();
    const db = client.db(dbName);
    const tenants = await db.collection('tenants').find({ isActive: true }).toArray();

    if (!tenants || tenants.length === 0) {
      console.log('No tenants found');
      return;
    }

    const rows = tenants.map(t => ({
      tenantSlug: t.tenantSlug,
      organizationName: t.organizationName,
      subscriptionTier: t.subscriptionTier,
      subscriptionStatus: t.subscriptionStatus,
      enabledModules: t.enabledModules || {},
    }));

    console.log(JSON.stringify({ count: rows.length, tenants: rows }, null, 2));
  } catch (err) {
    console.error('Error listing tenants:', err);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
}

main();
