const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI_MAIN || 'mongodb://localhost:27017';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    const startOfDay = new Date('2026-01-08T00:00:00Z');
    const events = await db.collection('whatsapp_webhook_events').find({
      createdAt: { $gte: startOfDay }
    }).sort({ createdAt: -1 }).limit(50).toArray();
    
    console.log(`Found ${events.length} events for today.`);
    events.forEach(e => {
      console.log(`[${e.createdAt.toISOString()}] Kind: ${e.kind}, OK: ${e.ok}, Message: ${e.message}`);
      if (!e.ok) {
        console.log('   Error Detail:', JSON.stringify(e.sample || e.error || {}));
      }
      if (e.kind === 'inbound_message' && e.ok) {
        console.log(`   Inbound from ${e.phoneNumber}: ${e.sample?.preview || 'no preview'}`);
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
