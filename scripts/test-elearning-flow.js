require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n✅ ===== TESTING FRONTEND ↔ BACKEND FLOW =====\n');

    // 1. Check Language Folders
    console.log('1️⃣  LANGUAGE FOLDERS (what frontend fetches)\n');
    const folders = await db.collection('language_folders')
      .find({ isActive: true })
      .sort({ order: 1 })
      .toArray();

    console.log(`   Found: ${folders.length} folder(s)\n`);
    folders.forEach((f, i) => {
      console.log(`   ${i+1}. "${f.name}" (${f.code})`);
      console.log(`      ID: ${f._id}`);
      console.log(`      Thumbnail: ${f.thumbnail ? 'YES' : 'NO'}\n`);
    });

    // 2. Check Courses in each folder
    console.log('\n2️⃣  COURSES IN FOLDERS (after clicking folder)\n');
    for (const folder of folders) {
      const courses = await db.collection('recordedcourses')
        .find({ folderId: folder._id, isActive: true, isPublished: true })
        .toArray();

      console.log(`   Folder: "${folder.name}"`);
      console.log(`   Courses: ${courses.length}`);
      
      if (courses.length === 0) {
        console.log(`   NO COURSES\n`);
      } else {
        courses.forEach((c, i) => {
          console.log(`      ${i+1}. "${c.content?.en?.title}"`);
          console.log(`         Videos: ${c.totalVideos || 0}`);
          console.log(`         Price: ${c.isFree ? 'FREE' : ('₹' + (c.pricing?.INR?.price || 0))}\n`);
        });
      }
    }

    // 3. Check Videos
    console.log('\n3️⃣  VIDEOS (playable content)\n');
    for (const folder of folders) {
      const courses = await db.collection('recordedcourses')
        .find({ folderId: folder._id, isActive: true, isPublished: true })
        .toArray();

      for (const course of courses) {
        const videos = await db.collection('coursevideos')
          .find({ courseId: course._id, isActive: true })
          .sort({ order: 1 })
          .toArray();

        console.log(`   Course: "${course.content?.en?.title}"`);
        console.log(`   Videos: ${videos.length}`);
        
        if (videos.length === 0) {
          console.log(`   NO VIDEOS - CANNOT PLAY\n`);
        } else {
          videos.forEach((v, i) => {
            const hasUrl = v.videoUrl || v.bunnyVideoId;
            console.log(`      ${i+1}. "${v.title}" - ${v.isFree ? 'FREE' : 'PAID'} - ${hasUrl ? 'OK' : 'NO URL'}`);
          });
          console.log('');
        }
      }
    }

    // 4. Summary
    console.log('\n4️⃣  SUMMARY - WHAT FRONTEND WILL SHOW\n');
    const totalFolders = folders.length;
    const totalCourses = (await db.collection('recordedcourses')
      .countDocuments({ isActive: true, isPublished: true }));
    const totalVideos = (await db.collection('coursevideos')
      .countDocuments({ isActive: true }));

    console.log(`   Language Folders: ${totalFolders}`);
    console.log(`   Courses: ${totalCourses}`);
    console.log(`   Videos: ${totalVideos}`);
    console.log(`\n   Status: ${totalFolders > 0 && totalCourses > 0 && totalVideos > 0 ? '🟢 READY FOR FRONTEND' : '🔴 INCOMPLETE'}\n`);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
