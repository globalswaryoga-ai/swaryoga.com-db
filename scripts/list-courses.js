#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGO_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

async function listCourses() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const courseSchema = new mongoose.Schema({}, { strict: false });
    const RecordedCourse = mongoose.model('RecordedCourse', courseSchema, 'recordedcourses');

    const courses = await RecordedCourse.find().select('_id slug content.en.title isActive isPublished').limit(10).lean();

    if (courses.length === 0) {
      console.log('❌ No courses found');
      process.exit(1);
    }

    console.log(`Found ${courses.length} courses:\n`);
    courses.forEach((course, idx) => {
      const title = course.content?.en?.title || 'Untitled';
      const status = (course.isActive && course.isPublished) ? '✅ Active' : '❌ Inactive';
      console.log(`${idx + 1}. ${title}`);
      console.log(`   ID: ${course._id}`);
      console.log(`   Status: ${status}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listCourses();
