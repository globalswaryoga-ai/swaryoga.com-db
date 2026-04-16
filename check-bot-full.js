require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI_MAIN;

const client = new MongoClient(uri);

(async () => {
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    
    // Get the specific schedule
    const schedule = await db.collection('sadhana_schedules').findOne({ name: 'Thursady sadhana text' });
    
    console.log('🎯 Schedule Details:');
    console.log(JSON.stringify(schedule, null, 2));
    
  } catch(e) {
    console.error('❌ Error:', e.message);
  } finally {
    await client.close();
  }
})();
