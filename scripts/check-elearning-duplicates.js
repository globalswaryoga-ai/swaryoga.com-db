#!/usr/bin/env node
/**
 * Check for duplicate courses and videos in E-Learning system
 * Usage: node scripts/check-elearning-duplicates.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // For self-signed cert issues
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  // Use main database
  const MONGO_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI || 'mongodb://localhost:27017/swaryogaDB';
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    // Try to use the database name from env or default
    const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
    const db = client.db(dbName);
    console.log(`📡 Connected to database: ${dbName}\n`);

    console.log('\n📊 ===== E-LEARNING DATA ANALYSIS =====\n');

    // ==========================================
    // CHECK COURSES
    // ==========================================
    console.log('🔍 CHECKING COURSES...\n');

    const courses = await db.collection('recordedcourses')
      .find({ isActive: true, isPublished: true })
      .project({
        _id: 1,
        slug: 1,
        'content.en.title': 1,
        totalVideos: 1,
        totalDuration: 1,
        folderId: 1,
        createdAt: 1
      })
      .toArray();

    console.log(`Total Active & Published Courses: ${courses.length}\n`);

    // List all courses
    console.log('📝 ALL COURSES:\n');
    courses.forEach((c, i) => {
      const title = c.content?.en?.title || 'Untitled';
      const created = new Date(c.createdAt).toLocaleDateString();
      const folderId = c.folderId ? c.folderId.toString() : 'NO FOLDER';
      console.log(`  ${i+1}. "${title}"`);
      console.log(`     ID: ${c._id}`);
      console.log(`     Folder: ${folderId}`);
      console.log(`     Videos: ${c.totalVideos || 0}`);
      console.log(`     Created: ${created}\n`);
    });

    // Check for duplicate titles
    const titleMap = {};
    const slugMap = {};
    const duplicateTitles = [];
    const duplicateSlugs = [];

    courses.forEach(course => {
      const title = course.content?.en?.title || 'Untitled';
      const slug = course.slug;

      if (!titleMap[title]) titleMap[title] = [];
      if (!slugMap[slug]) slugMap[slug] = [];

      titleMap[title].push(course);
      slugMap[slug].push(course);
    });

    // Find duplicates
    Object.entries(titleMap).forEach(([title, courseList]) => {
      if (courseList.length > 1) {
        duplicateTitles.push({ title, courses: courseList });
      }
    });

    Object.entries(slugMap).forEach(([slug, courseList]) => {
      if (courseList.length > 1) {
        duplicateSlugs.push({ slug, courses: courseList });
      }
    });

    if (duplicateTitles.length > 0) {
      console.log('⚠️  DUPLICATE COURSE TITLES FOUND:\n');
      duplicateTitles.forEach(({ title, courses }) => {
        console.log(`  Title: "${title}" (${courses.length} courses)`);
        courses.forEach((c, i) => {
          console.log(`    ${i+1}. ID: ${c._id}, Slug: ${c.slug}, Created: ${new Date(c.createdAt).toLocaleDateString()}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ No duplicate titles found\n');
    }

    if (duplicateSlugs.length > 0) {
      console.log('⚠️  DUPLICATE COURSE SLUGS FOUND:\n');
      duplicateSlugs.forEach(({ slug, courses }) => {
        console.log(`  Slug: "${slug}" (${courses.length} courses)`);
        courses.forEach((c, i) => {
          console.log(`    ${i+1}. ID: ${c._id}, Title: ${c.content?.en?.title}, Created: ${new Date(c.createdAt).toLocaleDateString()}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ No duplicate slugs found\n');
    }

    // ==========================================
    // CHECK VIDEOS
    // ==========================================
    console.log('\n🔍 CHECKING VIDEOS...\n');

    const videos = await db.collection('coursevideos')
      .find({ isActive: true })
      .project({
        _id: 1,
        courseId: 1,
        title: 1,
        bunnyVideoId: 1,
        duration: 1,
        isFree: 1,
        createdAt: 1
      })
      .toArray();

    console.log(`Total Active Videos: ${videos.length}\n`);

    // List all videos
    console.log('📹 ALL VIDEOS:\n');
    videos.forEach((v, i) => {
      const course = courses.find(c => c._id.toString() === v.courseId.toString());
      const courseTitle = course?.content?.en?.title || 'Unknown Course';
      const created = new Date(v.createdAt).toLocaleDateString();
      console.log(`  ${i+1}. "${v.title || 'Untitled'}"`);
      console.log(`     Course: "${courseTitle}"`);
      console.log(`     Video ID: ${v._id}`);
      console.log(`     isFree: ${v.isFree || false}`);
      console.log(`     Duration: ${v.duration}s`);
      console.log(`     Created: ${created}\n`);
    });

    // Videos by course
    const videoByCourse = {};
    videos.forEach(video => {
      const courseId = video.courseId.toString();
      if (!videoByCourse[courseId]) videoByCourse[courseId] = [];
      videoByCourse[courseId].push(video);
    });

    console.log('Videos by Course:\n');
    const courseIds = Object.keys(videoByCourse);
    let totalDuplicateVideos = 0;

    for (const courseId of courseIds) {
      const course = courses.find(c => c._id.toString() === courseId);
      const courseVideos = videoByCourse[courseId];
      const courseTitle = course?.content?.en?.title || courseId;

      // Check for duplicate video titles in same course
      const titleMap = {};
      const duplicates = [];

      courseVideos.forEach(v => {
        const title = v.title || 'Untitled';
        if (!titleMap[title]) titleMap[title] = [];
        titleMap[title].push(v);
      });

      Object.entries(titleMap).forEach(([title, videoList]) => {
        if (videoList.length > 1) {
          duplicates.push({ title, videos: videoList });
          totalDuplicateVideos += videoList.length - 1;
        }
      });

      if (duplicates.length > 0) {
        console.log(`  ⚠️  "${courseTitle}" (${courseVideos.length} videos, ${duplicates.length} duplicate sets)`);
        duplicates.forEach(({ title, videos }) => {
          console.log(`     - "${title}" (${videos.length} copies)`);
          videos.forEach((v, i) => {
            console.log(`       ${i+1}. ID: ${v._id}, isFree: ${v.isFree}, Created: ${new Date(v.createdAt).toLocaleDateString()}`);
          });
        });
      } else {
        console.log(`  ✅ "${courseTitle}" (${courseVideos.length} videos) - OK`);
      }
    }

    console.log(`\n⚠️  Total duplicate video copies to remove: ${totalDuplicateVideos}`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n📋 ===== SUMMARY =====\n');
    console.log(`Courses: ${courses.length}`);
    console.log(`  - Duplicate titles: ${duplicateTitles.length}`);
    console.log(`  - Duplicate slugs: ${duplicateSlugs.length}`);
    console.log(`\nVideos: ${videos.length}`);
    console.log(`  - Courses with duplicate videos: ${Object.values(videoByCourse).filter(v => {
      const titleMap = {};
      v.forEach(vid => {
        const title = vid.title || 'Untitled';
        if (!titleMap[title]) titleMap[title] = [];
        titleMap[title].push(vid);
      });
      return Object.values(titleMap).some(list => list.length > 1);
    }).length}`);
    console.log(`  - Total duplicate video copies: ${totalDuplicateVideos}`);

    console.log('\n💡 RECOMMENDATION:\n');
    if (duplicateTitles.length > 0 || duplicateSlugs.length > 0) {
      console.log('  1. Use admin CRM to review and delete duplicate courses');
      console.log('  2. Check course IDs above and delete the older ones');
    }
    if (totalDuplicateVideos > 0) {
      console.log('  1. Use /api/admin/recorded-courses/videos/check-duplicates (POST)');
      console.log('  2. Review and delete duplicate videos via the CRM');
    }

    console.log('\n');

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
