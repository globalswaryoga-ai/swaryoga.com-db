require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI_MAIN;

if (!uri) {
  console.error('❌ MONGODB_URI_MAIN not set');
  process.exit(1);
}

const client = new MongoClient(uri);

(async () => {
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    
    // Check recent schedules
    const logs = await db.collection('sadhana_schedules').find({}).sort({createdAt: -1}).limit(5).toArray();
    console.log('📅 Recent schedules:');
    logs.forEach(s => {
      console.log(`  - Name: ${s.name} | Time: ${s.schedule?.times?.[0]} | Status: ${s.status}`);
      if (s.enableBotAutomation) console.log('      ✅ Bot automation: ENABLED');
      console.log(`    | Zoom ID: ${s.zoomMeetingId} | Join Minutes: ${s.botJoinMinutes || 5}`);
    });
  } catch(e) {
    console.error('❌ Error:', e.message);
  } finally {
    await client.close();
  }
})();
