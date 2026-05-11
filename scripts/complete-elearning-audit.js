require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n🔍 ===== COMPLETE E-LEARNING SYSTEM AUDIT =====\n');

    const issues = [];

    // 1. Check Language Folders
    console.log('1️⃣  LANGUAGE FOLDERS AUDIT\n');
    const folders = await db.collection('language_folders').find({}).toArray();
    console.log(`   Total folders: ${folders.length}`);
    
    folders.forEach(f => {
      console.log(`   - "${f.name}" (${f.code}): Active=${f.isActive}, Has courses=?`);
      
      if (!f.code) issues.push(`❌ Folder "${f.name}" missing 'code' field`);
      if (!f.name) issues.push(`❌ Folder without name`);
      if (!f.flag) issues.push(`⚠️  Folder "${f.name}" missing flag emoji`);
    });
    console.log('');

    // 2. Check Courses
    console.log('2️⃣  COURSES AUDIT\n');
    const courses = await db.collection('recordedcourses').find({}).toArray();
    console.log(`   Total courses: ${courses.length}`);
    
    const activePublished = courses.filter(c => c.isActive && c.isPublished).length;
    const activeDraft = courses.filter(c => c.isActive && !c.isPublished).length;
    const inactive = courses.filter(c => !c.isActive).length;
    
    console.log(`   - Active & Published: ${activePublished}`);
    console.log(`   - Active & Draft: ${activeDraft}`);
    console.log(`   - Inactive: ${inactive}\n`);

    // Check for issues
    const activeCourses = courses.filter(c => c.isActive && c.isPublished);
    for (const course of activeCourses) {
      if (!course.slug) issues.push(`❌ Course "${course.content?.en?.title}" missing slug`);
      if (!course.content?.en?.title) issues.push(`❌ Course without English title`);
      if (course.totalVideos === undefined) issues.push(`⚠️  Course "${course.content?.en?.title}" missing totalVideos count`);
      
      // Check if belongs to folder
      if (!course.folderId) {
        issues.push(`❌ Course "${course.content?.en?.title}" not assigned to any folder`);
      }
    }
    console.log('');

    // 3. Check Videos
    console.log('3️⃣  VIDEOS AUDIT\n');
    const videos = await db.collection('coursevideos').find({}).toArray();
    console.log(`   Total videos: ${videos.length}`);
    
    const activeVideos = videos.filter(v => v.isActive).length;
    const inactiveVideos = videos.filter(v => !v.isActive).length;
    
    console.log(`   - Active: ${activeVideos}`);
    console.log(`   - Inactive/Deleted: ${inactiveVideos}\n`);

    // Check for issues
    for (const video of videos.filter(v => v.isActive)) {
      if (!video.title) issues.push(`❌ Video without title (ID: ${video._id})`);
      if (!video.videoUrl && !video.bunnyVideoId) {
        issues.push(`❌ Video "${video.title}" has no video URL or Bunny ID`);
      }
      if (video.isFree === undefined) issues.push(`⚠️  Video "${video.title}" missing isFree flag`);
    }
    console.log('');

    // 4. Check Duplicates
    console.log('4️⃣  DUPLICATE CHECK\n');
    
    // Duplicate course titles
    const titleMap = {};
    for (const course of activeCourses) {
      const title = course.content?.en?.title || 'Untitled';
      if (!titleMap[title]) titleMap[title] = [];
      titleMap[title].push(course);
    }
    
    let duplicateCourses = 0;
    for (const [title, courseList] of Object.entries(titleMap)) {
      if (courseList.length > 1) {
        duplicateCourses++;
        issues.push(`❌ DUPLICATE COURSE: "${title}" appears ${courseList.length} times`);
      }
    }
    console.log(`   Duplicate course titles: ${duplicateCourses}`);
    
    // Duplicate video titles per course
    let duplicateVideos = 0;
    for (const course of activeCourses) {
      const courseVideos = videos.filter(v => v.courseId.toString() === course._id.toString() && v.isActive);
      const vidTitleMap = {};
      
      for (const vid of courseVideos) {
        if (!vidTitleMap[vid.title]) vidTitleMap[vid.title] = [];
        vidTitleMap[vid.title].push(vid);
      }
      
      for (const [vidTitle, vidList] of Object.entries(vidTitleMap)) {
        if (vidList.length > 1) {
          duplicateVideos++;
          issues.push(`❌ DUPLICATE VIDEO: "${vidTitle}" in course "${course.content?.en?.title}" (${vidList.length} times)`);
        }
      }
    }
    console.log(`   Duplicate video titles: ${duplicateVideos}\n`);

    // 5. Frontend-Backend Sync Check
    console.log('5️⃣  FRONTEND-BACKEND SYNC CHECK\n');
    
    // What frontend should see
    const expectedDisplay = [];
    for (const folder of folders.filter(f => f.isActive)) {
      const folderCourses = activeCourses.filter(c => c.folderId?.toString() === folder._id.toString());
      if (folderCourses.length > 0) {
        expectedDisplay.push({
          folder: folder.name,
          courses: folderCourses.length,
          videos: folderCourses.reduce((sum, c) => sum + (c.totalVideos || 0), 0)
        });
      }
    }
    
    console.log('   What frontend SHOULD show:\n');
    if (expectedDisplay.length === 0) {
      issues.push('❌ NO FOLDERS with courses visible to frontend!');
      console.log('   ❌ NO FOLDERS WITH COURSES');
    } else {
      expectedDisplay.forEach(item => {
        console.log(`   ${item.folder}: ${item.courses} course(s), ${item.videos} video(s)`);
      });
    }
    console.log('');

    // 6. Summary
    console.log('\n📋 ===== ISSUES FOUND =====\n');
    if (issues.length === 0) {
      console.log('✅ NO ISSUES - System is healthy!\n');
    } else {
      console.log(`⚠️  TOTAL ISSUES: ${issues.length}\n`);
      issues.forEach((issue, i) => {
        console.log(`${i+1}. ${issue}`);
      });
      console.log('');
    }

    // 7. Recommendations
    console.log('\n💡 ===== RECOMMENDATIONS =====\n');
    if (issues.length > 0) {
      console.log('PRIORITY FIXES:');
      const criticalIssues = issues.filter(i => i.startsWith('❌'));
      const warnings = issues.filter(i => i.startsWith('⚠️'));
      
      if (criticalIssues.length > 0) {
        console.log(`\n1. Fix ${criticalIssues.length} CRITICAL issues (marked with ❌)`);
      }
      if (warnings.length > 0) {
        console.log(`2. Review ${warnings.length} warnings (marked with ⚠️)\n`);
      }
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
