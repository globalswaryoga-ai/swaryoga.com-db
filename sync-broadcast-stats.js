require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  console.log('\n🔄 SYNCING BROADCAST RUN STATS...\n');
  
  // Get all broadcast runs
  const runs = await db.collection('broadcast_runs').find({}).toArray();
  
  for (const run of runs) {
    // Count actual message statuses
    const counts = await db.collection('broadcast_run_messages').aggregate([
      { $match: { runId: run._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    
    const map = new Map();
    counts.forEach(c => map.set(c._id, c.count));
    
    // Calculate stats
    const pendingRaw = (map.get('pending') || 0) + (map.get('sending') || 0);
    const sentRaw = map.get('sent') || 0;
    const deliveredRaw = map.get('delivered') || 0;
    const readRaw = map.get('read') || 0;
    const failed = map.get('failed') || 0;
    const skipped = map.get('skipped') || 0;
    const blocked = map.get('blocked') || 0;
    
    // Status is cumulative: read implies delivered implies sent
    const read = readRaw;
    const delivered = deliveredRaw + readRaw;
    const sent = sentRaw + deliveredRaw + readRaw;
    const pending = pendingRaw;
    const total = pending + sent + failed + skipped + blocked;
    
    // Update the run
    await db.collection('broadcast_runs').updateOne(
      { _id: run._id },
      {
        $set: {
          'stats.total': total,
          'stats.pending': pending,
          'stats.sent': sent,
          'stats.delivered': delivered,
          'stats.read': read,
          'stats.failed': failed,
          'stats.skipped': skipped,
          'stats.blocked': blocked,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ ${run.name}: Total=${total}, Pending=${pending}, Sent=${sent}, Delivered=${delivered}, Read=${read}, Failed=${failed}, Blocked=${blocked}`);
  }
  
  console.log('\n✅ All stats synced!');
  await client.close();
})();
