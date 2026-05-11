require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });
  
  try {
    await client.connect();
    const db = client.db('swaryogaDB');

    console.log('\n🗑️  ===== DELETING OLD LANGUAGE FOLDERS =====\n');

    // Folders to delete (OLD)
    const OLD_FOLDER_IDS = [
      new ObjectId('69fef1f6361c81a416362e2c'), // "Swar Yoga Marathi"
      new ObjectId('69ff28d4115de2cd84cb6b3b')  // "Swar Yoga Wokshops"
    ];

    const KEEP_FOLDER_ID = new ObjectId('69fef9f7d44ba97577ef123c'); // "Swar Yoga Hindi"

    // Show what will be deleted
    const foldersToDelete = await db.collection('language_folders')
      .find({ _id: { $in: OLD_FOLDER_IDS } })
      .toArray();

    console.log('📂 FOLDERS TO DELETE:\n');
    foldersToDelete.forEach(f => {
      console.log(`  ❌ "${f.name}" (${f.code})`);
      console.log(`     ID: ${f._id}\n`);
    });

    // Show what will be kept
    const keepFolder = await db.collection('language_folders').findOne({ _id: KEEP_FOLDER_ID });
    console.log('📂 FOLDER TO KEEP:\n');
    console.log(`  ✅ "${keepFolder.name}" (${keepFolder.code})`);
    console.log(`     ID: ${keepFolder._id}\n`);

    // DELETE the old folders
    console.log('🔄 DELETING...\n');
    const deleteResult = await db.collection('language_folders').deleteMany({
      _id: { $in: OLD_FOLDER_IDS }
    });

    console.log(`✅ Deleted ${deleteResult.deletedCount} old folders\n`);

    // Verify
    console.log('✅ VERIFICATION:\n');
    const remainingFolders = await db.collection('language_folders').find({}).toArray();
    console.log(`Remaining folders: ${remainingFolders.length}`);
    remainingFolders.forEach(f => {
      console.log(`  - "${f.name}" (${f.code})`);
    });

    console.log('\n');

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
