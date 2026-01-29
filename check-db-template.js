#!/usr/bin/env node
// Check template structure in database

const { MongoClient } = require('mongodb');
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && !key.startsWith('#')) process.env[key.trim()] = val.join('=').trim();
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const template = await db.collection('whatsapp_templates').findOne({ templateName: 'swaryogabesic' });
  console.log('Template swaryogabesic:');
  console.log(JSON.stringify(template, null, 2));
  await client.close();
}
run().catch(console.error);
