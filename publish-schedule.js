#!/usr/bin/env node

/**
 * Script to publish the Basic Swar Yoga schedule
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function publish() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swaryoga';
    console.log('🔄 Connecting to MongoDB...\n');
    
    await mongoose.connect(uri);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    const collection = db.collection('workshopschedules');
    
    // Find the schedule
    const doc = await collection.findOne({
      workshopSlug: 'basic-swar-yoga',
      mode: 'online',
      language: 'Hindi'
    });

    if (!doc) {
      console.error('❌ Schedule not found');
      process.exit(1);
    }

    console.log('📋 Schedule Found:');
    console.log(`   ID: ${doc._id}`);
    console.log(`   Current Status: ${doc.status}`);
    console.log(`   Workshop: ${doc.workshopName}`);
    console.log(`   Language: ${doc.language}\n`);

    // Publish it
    const result = await collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          status: 'published',
          publishedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 1) {
      console.log('✅ Schedule published successfully!\n');
      console.log('📊 Updated:');
      console.log('   Status: draft → published');
      console.log('   publishedAt: ' + new Date().toISOString());
    } else {
      console.error('❌ Failed to update schedule');
      process.exit(1);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

publish();
