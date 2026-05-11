require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n🔍 COURSES WITH "SWAR YOGA" IN NAME:\n');

    const courses = await db.collection('recordedcourses')
      .find({ 
        'content.en.title': { $regex: 'swar.*yoga', $options: 'i' },
        isActive: true,
        isPublished: true
      })
      .project({
        _id: 1,
        'content.en.title': 1,
        folderId: 1,
        totalVideos: 1,
        createdAt: 1,
        updatedAt: 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${courses.length} courses:\n`);

    for (const course of courses) {
      const folder = course.folderId ? (
        await db.collection('language_folders').findOne({ _id: course.folderId })
      ) : null;

      console.log(`📚 "${course.content?.en?.title}"`);
      console.log(`   ID: ${course._id}`);
      console.log(`   Folder: ${folder ? folder.name : 'NO FOLDER'}`);
      console.log(`   Videos: ${course.totalVideos || 0}`);
      console.log(`   Created: ${new Date(course.createdAt).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(course.updatedAt).toLocaleDateString()}`);

      // List videos
      const videos = await db.collection('coursevideos')
        .find({ courseId: course._id, isActive: true })
        .project({ title: 1, isFree: 1 })
        .toArray();

      if (videos.length > 0) {
        console.log(`   Videos:`);
        videos.forEach((v, i) => {
          console.log(`     ${i+1}. "${v.title}" (Free: ${v.isFree})`);
        });
      } else {
        console.log(`   ❌ NO VIDEOS FOUND`);
      }
      console.log('');
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
