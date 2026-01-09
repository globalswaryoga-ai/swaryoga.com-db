const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI_MAIN || 'mongodb://localhost:27017';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    // Start of *today* in UTC so the script works on any day.
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const events = await db
      .collection('whatsapp_webhook_events')
      .find({
        $or: [{ createdAt: { $gte: startOfDay } }, { receivedAt: { $gte: startOfDay } }],
      })
      .sort({ receivedAt: -1, createdAt: -1 })
      .limit(50)
      .toArray();
    
    console.log(`Found ${events.length} events for today.`);
    events.forEach(e => {
      const ts = (e.receivedAt || e.createdAt);
      const tsLabel = ts && typeof ts.toISOString === 'function' ? ts.toISOString() : String(ts || 'N/A');
      console.log(`[${tsLabel}] Kind: ${e.kind}, OK: ${e.ok}, Message: ${e.message}`);
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
