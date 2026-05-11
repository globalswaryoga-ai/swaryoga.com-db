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

    const courseId = new ObjectId('69fefbede92f24a12359a2bf');
    
    // Get ALL videos for this course (both active and inactive)
    const allVideos = await db.collection('coursevideos').find({ courseId }).toArray();
    
    console.log(`\n📹 ALL Videos (including inactive) for this course:\n`);
    allVideos.forEach((v, i) => {
      console.log(`${i+1}. "${v.title}"`);
      console.log(`   isActive: ${v.isActive}`);
      console.log(`   isFree: ${v.isFree}`);
      console.log(`   Duration: ${v.duration}s\n`);
    });

    console.log(`\nTotal Videos: ${allVideos.length}`);
    console.log(`Active: ${allVideos.filter(v => v.isActive).length}`);
    console.log(`Inactive: ${allVideos.filter(v => !v.isActive).length}`);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
