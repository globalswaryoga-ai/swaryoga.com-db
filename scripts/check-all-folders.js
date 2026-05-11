require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n📂 ===== ALL FOLDERS & THEIR COURSES =====\n');

    // Find all language folders
    const folders = await db.collection('language_folders').find({}).toArray();
    
    for (const folder of folders) {
      console.log(`\n📁 "${folder.name}" (${folder.code})`);
      console.log(`   ID: ${folder._id}`);
      console.log(`   Active: ${folder.isActive}`);

      // Find courses in this folder
      const courses = await db.collection('recordedcourses')
        .find({ folderId: folder._id, isActive: true, isPublished: true })
        .project({
          _id: 1,
          'content.en.title': 1,
          totalVideos: 1,
          createdAt: 1
        })
        .toArray();

      if (courses.length === 0) {
        console.log(`   ❌ No courses\n`);
      } else {
        console.log(`   ✅ Courses: ${courses.length}`);
        for (const course of courses) {
          console.log(`      - "${course.content?.en?.title}" (${course.totalVideos || 0} videos)`);
          
          // Get videos
          const videos = await db.collection('coursevideos')
            .find({ courseId: course._id, isActive: true })
            .toArray();
          
          if (videos.length > 0) {
            videos.forEach((v, i) => {
              console.log(`        ${i+1}. ${v.title}`);
            });
          }
        }
      }
    }

    console.log('\n\n📂 ===== COURSES WITHOUT FOLDER (Legacy) =====\n');
    const orphaned = await db.collection('recordedcourses')
      .find({ $or: [{ folderId: null }, { folderId: { $exists: false } }], isActive: true, isPublished: true })
      .project({
        _id: 1,
        'content.en.title': 1,
        totalVideos: 1,
        createdAt: 1
      })
      .toArray();

    if (orphaned.length === 0) {
      console.log('✅ No orphaned courses\n');
    } else {
      console.log(`⚠️  ${orphaned.length} courses without folder:\n`);
      orphaned.forEach(c => {
        console.log(`   - "${c.content?.en?.title}" (${c.totalVideos || 0} videos)`);
      });
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
