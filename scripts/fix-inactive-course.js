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

    // Find the inactive course from 5/11
    const inactiveCourse = await db.collection('recordedcourses').findOne({
      slug: 'swar-yoga-hindi',
      createdAt: { $gte: new Date('2026-05-11') }
    });

    if (inactiveCourse) {
      console.log(`\n📍 Found Course: "${inactiveCourse.content?.en?.title}"`);
      console.log(`   ID: ${inactiveCourse._id}`);
      console.log(`   Current Status: Active=${inactiveCourse.isActive}, Published=${inactiveCourse.isPublished}`);
      console.log(`   Folder: ${inactiveCourse.folderId?.toString() || 'NO FOLDER'}`);
      console.log(`   Videos: ${inactiveCourse.totalVideos}\n`);

      // Check folder status
      if (inactiveCourse.folderId) {
        const folder = await db.collection('language_folders').findOne({
          _id: new ObjectId(inactiveCourse.folderId)
        });
        if (folder) {
          console.log(`📁 Folder: "${folder.name}"`);
          console.log(`   ID: ${folder._id}`);
          console.log(`   Active: ${folder.isActive}\n`);
        }
      }

      // Activate the course
      const result = await db.collection('recordedcourses').updateOne(
        { _id: inactiveCourse._id },
        { 
          $set: { 
            isActive: true,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Course ACTIVATED successfully!`);
        console.log(`\n🎯 The course "${inactiveCourse.content?.en?.title}" is now visible on the frontend.\n`);
      }
    } else {
      console.log('❌ Course not found\n');
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
