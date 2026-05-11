require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n📂 ===== HINDI FOLDER ANALYSIS =====\n');

    // Find language folders
    const folders = await db.collection('language_folders').find({}).toArray();
    console.log(`Found ${folders.length} language folders:\n`);
    
    folders.forEach(f => {
      console.log(`  📁 "${f.name}" (${f.code})`);
      console.log(`     ID: ${f._id}`);
      console.log(`     Active: ${f.isActive}`);
      console.log('');
    });

    // Find Hindi folder (with "hindi" in name or code)
    const hindiFolder = folders.find(f => 
      f.name?.toLowerCase().includes('hindi') || 
      f.code === 'hi' ||
      f.name?.toLowerCase().includes('swar')
    );

    if (!hindiFolder) {
      console.log('❌ No Hindi folder found!\n');
      console.log('Available folders:');
      folders.forEach(f => console.log(`  - ${f.name} (${f.code})`));
      await client.close();
      return;
    }

    console.log(`\n✅ Found Hindi Folder: "${hindiFolder.name}"`);
    console.log(`   ID: ${hindiFolder._id}\n`);

    // Find courses in this folder
    const coursesInFolder = await db.collection('recordedcourses')
      .find({ folderId: hindiFolder._id, isActive: true, isPublished: true })
      .project({
        _id: 1,
        'content.en.title': 1,
        totalVideos: 1,
        totalDuration: 1,
        createdAt: 1
      })
      .toArray();

    console.log(`📚 Courses in "${hindiFolder.name}" folder: ${coursesInFolder.length}\n`);
    
    if (coursesInFolder.length === 0) {
      console.log('❌ NO COURSES FOUND IN THIS FOLDER!\n');
    } else {
      coursesInFolder.forEach((course, i) => {
        console.log(`  ${i+1}. "${course.content?.en?.title}"`);
        console.log(`     ID: ${course._id}`);
        console.log(`     Videos: ${course.totalVideos || 0}`);
        console.log(`     Created: ${new Date(course.createdAt).toLocaleDateString()}\n`);

        // Get videos for this course
        // Commented out to keep output short
      });
    }

    // Get all videos for courses in this folder
    console.log('\n📹 ALL VIDEOS IN FOLDER COURSES:\n');
    
    for (const course of coursesInFolder) {
      const videos = await db.collection('coursevideos')
        .find({ courseId: course._id, isActive: true })
        .project({ _id: 1, title: 1, isFree: 1, duration: 1, createdAt: 1 })
        .toArray();

      console.log(`  Course: "${course.content?.en?.title}" (${videos.length} videos)`);
      
      if (videos.length === 0) {
        console.log(`    ❌ NO VIDEOS FOUND\n`);
      } else {
        videos.forEach((v, i) => {
          console.log(`    ${i+1}. "${v.title}" (isFree: ${v.isFree}, ${v.duration}s)`);
          console.log(`       ID: ${v._id}, Created: ${new Date(v.createdAt).toLocaleDateString()}`);
        });
        console.log('');
      }
    }

    // Summary
    console.log('\n📋 SUMMARY:\n');
    console.log(`✅ Total courses in folder: ${coursesInFolder.length} (you said 1)`);
    const totalVideos = (await Promise.all(
      coursesInFolder.map(c => 
        db.collection('coursevideos').countDocuments({ courseId: c._id, isActive: true })
      )
    )).reduce((a, b) => a + b, 0);
    console.log(`✅ Total videos in folder: ${totalVideos} (you said 2)\n`);

    if (coursesInFolder.length > 1) {
      console.log('⚠️  ISSUE: You have more than 1 course in the folder!');
      console.log('   This might be why you see 3 courses in frontend.\n');
    }

    if (totalVideos < 2) {
      console.log('⚠️  ISSUE: You added 2 videos but only seeing ' + totalVideos);
      console.log('   One video might be missing or deactivated.\n');
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
