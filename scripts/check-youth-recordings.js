/**
 * Check Youth Program recordings in database
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  console.log('Connected to MongoDB');

  // Check for zoom recordings synced
  const ZoomRecording = mongoose.model('ZoomRecording', new mongoose.Schema({}, { strict: false }));
  
  const youthRecordings = await ZoomRecording.find({
    $or: [
      { topic: /youth/i },
      { meetingId: '83376917306' },
      { meetingId: 83376917306 },
    ]
  }).lean();
  
  console.log('\n🧘 Youth Program recordings in DB:', youthRecordings.length);
  youthRecordings.forEach((r, i) => {
    console.log(`${i+1}. ${r.topic || r.meetingTopic} - ${r.startTime}`);
    if (r.galleryView) console.log('   Gallery:', r.galleryView.s3Key);
    if (r.speakerView) console.log('   Speaker:', r.speakerView.s3Key);
  });

  // Also check all zoom recordings
  const all = await ZoomRecording.find().sort({ syncedAt: -1 }).limit(15).lean();
  console.log('\n📹 All recent synced recordings:', all.length);
  all.forEach((r, i) => {
    console.log(`${i+1}. ${r.topic || r.meetingTopic || 'No topic'} (ID: ${r.meetingId})`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
