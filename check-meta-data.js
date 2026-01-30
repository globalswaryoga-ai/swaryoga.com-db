require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Check Meta broadcast runs
  const metaRuns = await db.collection('broadcast_runs').find({ provider: 'meta' }).sort({ createdAt: -1 }).limit(5).toArray();
  console.log('\n📊 META BROADCAST RUNS:', metaRuns.length);
  
  for (const r of metaRuns) {
    console.log(`\n📌 ${r.name}`);
    console.log(`   Status: ${r.status}`);
    console.log(`   Stats: Total=${r.stats?.total || 0}, Pending=${r.stats?.pending || 0}, Sent=${r.stats?.sent || 0}, Delivered=${r.stats?.delivered || 0}, Failed=${r.stats?.failed || 0}`);
    console.log(`   Scheduled: ${r.scheduledAt || 'N/A'}`);
    
    // Check actual message counts
    const counts = await db.collection('broadcast_run_messages').aggregate([
      { $match: { runId: r._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log('   Actual msgs:', counts);
  }
  
  await client.close();
})();
