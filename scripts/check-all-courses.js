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

    const allCourses = await db.collection('recordedcourses').find({}).toArray();
    
    console.log(`\n📊 ALL COURSES (including inactive/unpublished):\n`);
    allCourses.forEach((c, i) => {
      console.log(`${i+1}. "${c.content?.en?.title || 'Untitled'}"`);
      console.log(`   ID: ${c._id}`);
      console.log(`   Slug: ${c.slug}`);
      console.log(`   Folder: ${c.folderId?.toString() || 'NO FOLDER'}`);
      console.log(`   Active: ${c.isActive}, Published: ${c.isPublished}`);
      console.log(`   Videos: ${c.totalVideos || 0}`);
      console.log(`   Created: ${new Date(c.createdAt).toLocaleDateString()}\n`);
    });

    console.log(`\nTotal Courses: ${allCourses.length}`);
    console.log(`Active & Published: ${allCourses.filter(c => c.isActive && c.isPublished).length}`);
    console.log(`Inactive: ${allCourses.filter(c => !c.isActive).length}`);
    console.log(`Draft: ${allCourses.filter(c => c.isActive && !c.isPublished).length}`);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
