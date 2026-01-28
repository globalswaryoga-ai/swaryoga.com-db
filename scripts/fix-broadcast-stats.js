/**
 * Fix broadcast run stats - recalculate with cumulative status logic
 * Status is cumulative: read implies delivered implies sent
 */

const { MongoClient, ObjectId } = require('mongodb');

async function fixStats() {
  const uri = process.env.MONGODB_URI_MAIN || 'mongodb+srv://mohan:nA4xLLpxL1kxHe2O@cluster0.ydq4q.mongodb.net/swaryoga_admin_crm?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('swaryoga_admin_crm');
    const runsCollection = db.collection('broadcastruns');
    const messagesCollection = db.collection('broadcastrunmessages');
    
    // Get all broadcast runs
    const runs = await runsCollection.find({}).toArray();
    console.log(`Found ${runs.length} broadcast runs to fix`);
    
    for (const run of runs) {
      const runId = run._id;
      
      // Aggregate message statuses
      const counts = await messagesCollection.aggregate([
        { $match: { runId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray();
      
      const map = new Map();
      counts.forEach(c => map.set(String(c._id || '').toLowerCase(), Number(c.count || 0)));
      
      // Count by actual status
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
      
      const newStats = { total, pending, sent, delivered, read, failed, skipped, blocked };
      
      console.log(`\nRun: ${run.name || run._id}`);
      console.log('  Old stats:', JSON.stringify(run.stats || {}));
      console.log('  New stats:', JSON.stringify(newStats));
      
      // Update the run
      await runsCollection.updateOne(
        { _id: runId },
        { $set: { stats: newStats, updatedAt: new Date() } }
      );
      console.log('  ✅ Updated');
    }
    
    console.log('\n✅ All broadcast run stats fixed!');
    
  } finally {
    await client.close();
  }
}

fixStats().catch(console.error);
