require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n🔍 CHECKING FOR DUPLICATE VIDEOS\n');

    // Get the Hindi folder course
    const hindiFolder = await db.collection('language_folders').findOne({ code: 'hi' });
    const course = await db.collection('recordedcourses')
      .findOne({ folderId: hindiFolder._id, isActive: true, isPublished: true });

    console.log(`Course: "${course.content?.en?.title}"\n`);

    // Get all videos
    const videos = await db.collection('coursevideos')
      .find({ courseId: course._id, isActive: true })
      .sort({ createdAt: 1 })
      .toArray();

    console.log(`Total Videos: ${videos.length}\n`);

    videos.forEach((v, i) => {
      console.log(`${i+1}. "${v.title}"`);
      console.log(`   ID: ${v._id}`);
      console.log(`   isFree: ${v.isFree}`);
      console.log(`   Duration: ${v.duration}s`);
      console.log(`   Thumbnail: ${v.thumbnail ? 'YES' : 'NO'}`);
      console.log(`   Created: ${new Date(v.createdAt).toLocaleDateString()}`);
      console.log(`   BunnyID: ${v.bunnyVideoId || 'NONE'}\n`);
    });

    // Check for duplicates by title (case-insensitive)
    const titleMap = {};
    videos.forEach(v => {
      const key = (v.title || '').toLowerCase();
      if (!titleMap[key]) titleMap[key] = [];
      titleMap[key].push(v);
    });

    console.log('\n📋 DUPLICATE CHECK:\n');
    let hasDuplicates = false;
    Object.entries(titleMap).forEach(([title, vids]) => {
      if (vids.length > 1) {
        hasDuplicates = true;
        console.log(`⚠️  DUPLICATE FOUND: "${title}" (${vids.length} times)`);
        vids.forEach((v, i) => {
          console.log(`   ${i+1}. ID: ${v._id} - Created: ${new Date(v.createdAt).toLocaleDateString()}`);
        });
        console.log('');
      }
    });

    if (!hasDuplicates && videos.length > 2) {
      console.log('No exact title duplicates, but you have 3 videos (expected 2)');
      console.log('\nVideos that look similar by thumbnail:');
      console.log(`  - Video 1: "${videos[0].title}" (thumbnail might match video 3)`);
      console.log(`  - Video 3: "${videos[2].title}"\n`);
      console.log('Check if one of these should be deleted\n');
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
