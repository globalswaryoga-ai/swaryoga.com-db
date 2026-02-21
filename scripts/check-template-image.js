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
  
  // Check S3 uploads folder for template images
  console.log('\n=== Checking S3 for template images ===');
  const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });
  
  const bucket = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'templates/',
    MaxKeys: 20
  }));
  
  if (result.Contents && result.Contents.length > 0) {
    console.log('Found', result.Contents.length, 'template files in S3:');
    result.Contents.forEach(obj => {
      const url = 'https://' + bucket + '.s3.' + (process.env.AWS_REGION || 'us-east-1') + '.amazonaws.com/' + obj.Key;
      console.log('  ' + url);
    });
  } else {
    console.log('No template files found in S3 templates/ folder');
  }
  
  await client.close();
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
