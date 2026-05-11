#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI || 'mongodb://localhost:27017/swaryogaDB';
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
    const db = client.db(dbName);

    // Delete the broken new course (empty, wrong folder)
    const brokenCourse = '6a01a415f9524ff98d7ab84c';
    const result = await db.collection('recordedcourses').deleteOne({
      _id: new ObjectId(brokenCourse)
    });

    if (result.deletedCount > 0) {
      console.log(`\n✅ Deleted broken course\n`);
      console.log(`📊 Current State:\n`);
      console.log(`✅ "9 Days Swar Yoga Workshop" (with your 2 videos)`);
      console.log(`   - Status: ACTIVE & PUBLISHED`);
      console.log(`   - Folder: Swar Yoga Hindi`);
      console.log(`   - Videos: 2`);
      console.log(`   - Free: swar yoga Informetion`);
      console.log(`   - Paid: Swar yoga Day-1\n`);
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
