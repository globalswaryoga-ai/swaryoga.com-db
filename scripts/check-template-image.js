#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function check() {
  const uri = process.env.MONGODB_URI_MAIN;
  const dbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  if (!uri) {
    console.error('MONGODB_URI_MAIN not found');
    process.exit(1);
  }
  
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to MongoDB, DB:', dbName);
  
  const db = client.db(dbName);
  
  // List collections
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name).join(', '));
  
  // Get all templates from whatsapp_templates collection
  const templates = await db.collection('whatsapp_templates').find({}).toArray();
  
  console.log('Found', templates.length, 'templates total');
  
  templates.forEach(t => {
    console.log('\n--- Template ---');
    console.log('Name:', t.templateName);
    if (t.imageFile) {
      console.log('ImageFile URL:', t.imageFile.url);
      console.log('Is blob URL?', t.imageFile.url?.startsWith('blob:'));
      console.log('Is S3 URL?', t.imageFile.url?.includes('s3.') || t.imageFile.url?.includes('amazonaws.com'));
    } else {
      console.log('No imageFile');
    }
  });
  
  await client.close();
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
