require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n🔧 ===== FIXING E-LEARNING DATABASE =====\n');

    // Correct course IDs
    const CORRECT_COURSE_ID = new ObjectId('69fefbede92f24a12359a2bf'); // "9 Days Swar Yoga Workshop" in Hindi folder
    const WRONG_COURSE_ID = new ObjectId('6a01a415f9524ff98d7ab84c');    // "9 Days Swar Yoga " without folder

    const LEGACY_COURSES = [
      '69fe1883494666baeee04fb4', // "Swar Yoga Workshop"
      '69fed1fa9ce4be39304d46f7', // "Aahar Shastra-Swar Yoga Marathi"
      '69fed35e9ce4be39304d4722', // "Swar Yoga Meditation"
      '69fed5689ce4be39304d4763', // "Swar Yoga Mind Prgoram"
      '69fed75b9ce4be39304d47c4'  // "Why Swar Yoga"
    ];

    // STEP 1: Move videos from wrong course to correct course
    console.log('📹 STEP 1: Moving videos to correct course...\n');
    
    const videosToMove = await db.collection('coursevideos')
      .find({ courseId: WRONG_COURSE_ID, isActive: true })
      .toArray();

    console.log(`Found ${videosToMove.length} videos to move:`);
    videosToMove.forEach(v => {
      console.log(`  - "${v.title}"`);
    });

    if (videosToMove.length > 0) {
      const result = await db.collection('coursevideos').updateMany(
        { courseId: WRONG_COURSE_ID, isActive: true },
        { $set: { courseId: CORRECT_COURSE_ID } }
      );
      console.log(`\n✅ Moved ${result.modifiedCount} videos\n`);
    }

    // STEP 2: Update correct course video count
    console.log('📊 STEP 2: Updating correct course...\n');
    const newVideoCount = await db.collection('coursevideos').countDocuments({
      courseId: CORRECT_COURSE_ID,
      isActive: true
    });

    await db.collection('recordedcourses').updateOne(
      { _id: CORRECT_COURSE_ID },
      { $set: { totalVideos: newVideoCount } }
    );
    console.log(`✅ Updated video count to ${newVideoCount}\n`);

    // STEP 3: Deactivate wrong course
    console.log('🗑️  STEP 3: Deactivating duplicate course...\n');
    await db.collection('recordedcourses').updateOne(
      { _id: WRONG_COURSE_ID },
      { 
        $set: { 
          isActive: false,
          deletedAt: new Date(),
          deletedBy: 'admin-cleanup'
        }
      }
    );
    console.log(`✅ Deactivated "9 Days Swar Yoga " (without folder)\n`);

    // STEP 4: Deactivate legacy courses
    console.log('🗑️  STEP 4: Deactivating 5 legacy courses without folders...\n');
    const legacyIds = LEGACY_COURSES.map(id => new ObjectId(id));
    
    const legacyResult = await db.collection('recordedcourses').updateMany(
      { _id: { $in: legacyIds } },
      { 
        $set: { 
          isActive: false,
          deletedAt: new Date(),
          deletedBy: 'admin-cleanup'
        }
      }
    );
    console.log(`✅ Deactivated ${legacyResult.modifiedCount} legacy courses\n`);

    // STEP 5: Verify
    console.log('✅ STEP 5: Verification...\n');
    
    const correctCourse = await db.collection('recordedcourses').findOne({ _id: CORRECT_COURSE_ID });
    const videosInCorrect = await db.collection('coursevideos').countDocuments({
      courseId: CORRECT_COURSE_ID,
      isActive: true
    });

    console.log(`📚 Correct Course: "${correctCourse.content?.en?.title}"`);
    console.log(`   Folder: Swar Yoga Hindi ✅`);
    console.log(`   Videos: ${videosInCorrect}`);
    console.log(`   Video list:`);
    
    const videos = await db.collection('coursevideos')
      .find({ courseId: CORRECT_COURSE_ID, isActive: true })
      .toArray();
    
    videos.forEach((v, i) => {
      console.log(`     ${i+1}. "${v.title}"`);
    });

    console.log('\n');

    // Count remaining active courses
    const activeCourses = await db.collection('recordedcourses').countDocuments({
      isActive: true,
      isPublished: true
    });

    console.log(`\n📊 FINAL SUMMARY:\n`);
    console.log(`✅ Videos moved: ${videosToMove.length}`);
    console.log(`✅ Duplicate course deactivated: 1`);
    console.log(`✅ Legacy courses deactivated: ${legacyResult.modifiedCount}`);
    console.log(`✅ Active published courses remaining: ${activeCourses}`);
    console.log(`✅ Your Hindi folder course now has: ${videosInCorrect} videos\n`);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
