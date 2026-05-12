#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGO_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

async function listCollections() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(`Found ${collections.length} collections:\n`);

    const courseCollections = collections.filter(c => c.name.toLowerCase().includes('course') || c.name.toLowerCase().includes('recorded'));

    if (courseCollections.length > 0) {
      console.log('📚 Course-related collections:');
      courseCollections.forEach(c => console.log(`   - ${c.name}`));
    }

    console.log('\n📊 All collections:');
    collections.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listCollections();
