#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { MongoClient } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI || 'mongodb://localhost:27017/swaryogaDB';
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
    const db = client.db(dbName);

    const folders = await db.collection('language_folders').find({}).toArray();
    
    console.log(`\n📁 ALL Language Folders:\n`);
    folders.forEach((f, i) => {
      console.log(`${i+1}. "${f.name}"`);
      console.log(`   ID: ${f._id}`);
      console.log(`   Code: ${f.code}`);
      console.log(`   Active: ${f.isActive}`);
      console.log(`   Created: ${new Date(f.createdAt).toLocaleDateString()}\n`);
    });

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
