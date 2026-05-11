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

    // Find videos created on 5/11
    const todayVideos = await db.collection('coursevideos').find({
      createdAt: { $gte: new Date('2026-05-11'), $lt: new Date('2026-05-12') }
    }).toArray();
    
    console.log(`\n📹 Videos Created on 5/11/2026:\n`);
    console.log(`Total: ${todayVideos.length}\n`);
    
    todayVideos.forEach((v, i) => {
      console.log(`${i+1}. "${v.title}"`);
      console.log(`   ID: ${v._id}`);
      console.log(`   Course ID: ${v.courseId}`);
      console.log(`   isActive: ${v.isActive}`);
      console.log(`   isFree: ${v.isFree}\n`);
    });

    // Get the course names for these videos
    console.log(`\n🔍 Finding courses for these videos:\n`);
    const courseIds = [...new Set(todayVideos.map(v => v.courseId.toString()))];
    
    for (const courseId of courseIds) {
      const course = await db.collection('recordedcourses').findOne({ _id: require('mongodb').ObjectId.createFromHexString(courseId) });
      console.log(`Course: "${course?.content?.en?.title}"`);
      console.log(`  ID: ${courseId}`);
      console.log(`  Active: ${course?.isActive}, Published: ${course?.isPublished}`);
      console.log(`  totalVideos in metadata: ${course?.totalVideos}\n`);
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
