require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n🗑️  DELETING DUPLICATE VIDEO\n');

    const VIDEO_ID = new ObjectId('6a00f639040882bdcacd474a'); // "Introduction about swar yoga"

    // Get video details
    const video = await db.collection('coursevideos').findOne({ _id: VIDEO_ID });
    console.log(`Video to DELETE: "${video.title}"`);
    console.log(`ID: ${VIDEO_ID}`);
    console.log(`Created: ${new Date(video.createdAt).toLocaleDateString()}\n`);

    // Delete (mark as inactive)
    const result = await db.collection('coursevideos').updateOne(
      { _id: VIDEO_ID },
      {
        $set: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: 'admin-cleanup'
        }
      }
    );

    console.log(`✅ DELETED\n`);

    // Verify remaining videos
    console.log('✅ REMAINING VIDEOS:\n');
    const hindiFolder = await db.collection('language_folders').findOne({ code: 'hi' });
    const course = await db.collection('recordedcourses')
      .findOne({ folderId: hindiFolder._id, isActive: true, isPublished: true });

    const remainingVideos = await db.collection('coursevideos')
      .find({ courseId: course._id, isActive: true })
      .sort({ createdAt: 1 })
      .toArray();

    console.log(`Total Videos: ${remainingVideos.length}\n`);
    remainingVideos.forEach((v, i) => {
      console.log(`${i+1}. "${v.title}" (${v.isFree ? 'FREE' : 'PAID'})`);
    });

    // Update course video count
    await db.collection('recordedcourses').updateOne(
      { _id: course._id },
      { $set: { totalVideos: remainingVideos.length } }
    );

    console.log(`\n✅ Course video count updated to: ${remainingVideos.length}`);
    console.log('\n');

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
