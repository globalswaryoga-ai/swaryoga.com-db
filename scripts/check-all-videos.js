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

    const courseId = new ObjectId('6a01a415f9524ff98d7ab84c');
    
    // Get all videos (including inactive)
    const allVideos = await db.collection('coursevideos').find({ courseId }).toArray();
    
    console.log(`\n📹 ALL Videos (including inactive) for Course ID: ${courseId}:\n`);
    console.log(`Total: ${allVideos.length}\n`);
    
    allVideos.forEach((v, i) => {
      console.log(`${i+1}. "${v.title}"`);
      console.log(`   ID: ${v._id}`);
      console.log(`   isActive: ${v.isActive}`);
      console.log(`   isFree: ${v.isFree}`);
      console.log(`   Duration: ${v.duration}s`);
      console.log(`   Created: ${new Date(v.createdAt).toLocaleDateString()}\n`);
    });

    // Also check total courses count
    const totalCourses = await db.collection('recordedcourses').countDocuments();
    console.log(`\nTotal Courses in DB: ${totalCourses}`);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
