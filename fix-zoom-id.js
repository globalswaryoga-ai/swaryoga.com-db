require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI_MAIN;

const client = new MongoClient(uri);

(async () => {
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    
    // Find the schedule
    const schedule = await db.collection('sadhana_schedules').findOne({ name: 'Thursady sadhana text' });
    
    if (!schedule) {
      console.error('❌ Schedule not found');
      process.exit(1);
    }
    
    // Extract meeting ID from zoomLink
    const urlMatch = schedule.zoomLink?.match(/\/j\/(\d+)/);
    const pwdMatch = schedule.zoomLink?.match(/[?&]pwd=([^&]+)/);
    
    if (!urlMatch) {
      console.error('❌ Could not extract meeting ID from zoom link');
      process.exit(1);
    }
    
    const meetingId = urlMatch[1];
    const password = pwdMatch ? decodeURIComponent(pwdMatch[1]) : null;
    
    console.log('📝 Extracted from Zoom Link:');
    console.log('  - Meeting ID:', meetingId);
    console.log('  - Password:', password);
    
    // Update the schedule
    const result = await db.collection('sadhana_schedules').updateOne(
      { _id: schedule._id },
      {
        $set: {
          zoomMeetingId: meetingId,
          zoomPassword: password,
        }
      }
    );
    
    console.log('\n✅ Schedule updated:');
    console.log('  - Matched:', result.matchedCount);
    console.log('  - Modified:', result.modifiedCount);
    
    // Verify
    const updated = await db.collection('sadhana_schedules').findOne({ name: 'Thursady sadhana text' });
    console.log('\n🎯 Verification:');
    console.log('  - zoomMeetingId:', updated.zoomMeetingId);
    console.log('  - zoomPassword:', updated.zoomPassword);
    
  } catch(e) {
    console.error('❌ Error:', e.message);
  } finally {
    await client.close();
  }
})();
