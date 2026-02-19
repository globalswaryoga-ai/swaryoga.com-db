require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  const now = new Date();
  console.log('Current time:', now.toISOString());
  console.log('');
  
  // Check scheduled broadcasts
  const scheduled = await db.collection('broadcast_runs')
    .find({ status: 'scheduled' })
    .sort({ scheduledAt: 1 })
    .toArray();
  
  console.log('=== SCHEDULED BROADCASTS ===');
  console.log('Count:', scheduled.length);
  scheduled.forEach(b => {
    const scheduledTime = new Date(b.scheduledAt);
    const isPast = scheduledTime < now;
    console.log('-', b.name);
    console.log('  Scheduled:', b.scheduledAt, isPast ? '(PAST DUE!)' : '');
    console.log('  Provider:', b.provider || 'meta(default)');
    console.log('  Template:', b.templateId);
    console.log('  Recipients:', b.recipientCount || (b.leadIds?.length || 0));
  });
  
  // Check running broadcasts
  const running = await db.collection('broadcast_runs')
    .find({ status: 'running' })
    .toArray();
  
  console.log('\n=== RUNNING BROADCASTS ===');
  console.log('Count:', running.length);
  running.forEach(b => {
    console.log('-', b.name, '| Started:', b.startedAt);
  });
  
  // Check recent completed
  const recent = await db.collection('broadcast_runs')
    .find({ status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(3)
    .toArray();
  
  console.log('\n=== RECENT COMPLETED ===');
  recent.forEach(b => {
    console.log('-', b.name, '| Completed:', b.completedAt);
    console.log('  Stats:', JSON.stringify(b.stats));
  });
  
  // Check recent failed
  const failed = await db.collection('broadcast_runs')
    .find({ status: 'failed' })
    .sort({ updatedAt: -1 })
    .limit(3)
    .toArray();
  
  console.log('\n=== RECENT FAILED ===');
  console.log('Count:', failed.length);
  failed.forEach(b => {
    console.log('-', b.name, '| Error:', b.lastError || 'Unknown');
  });
  
  await client.close();
}

check().catch(console.error);
