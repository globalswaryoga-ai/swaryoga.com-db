const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Check recent broadcast runs
  const runs = await crmDb.collection('broadcast_runs').find({
    provider: 'qr'
  }).sort({ createdAt: -1 }).limit(10).toArray();
  
  console.log('=== Recent QR Broadcast Runs ===');
  runs.forEach(r => {
    console.log('---');
    console.log('ID:', r._id.toString());
    console.log('Name:', r.name);
    console.log('Status:', r.status);
    console.log('Mode:', r.mode);
    console.log('ScheduledAt:', r.scheduledAt);
    console.log('StartedAt:', r.startedAt);
    console.log('CompletedAt:', r.completedAt);
    console.log('Stats:', JSON.stringify(r.stats));
    console.log('CreatedAt:', r.createdAt);
    console.log('LastError:', r.lastError);
  });
  
  // Find any scheduled runs that haven't started
  const pendingScheduled = await crmDb.collection('broadcast_runs').find({
    provider: 'qr',
    mode: 'schedule',
    status: { $in: ['scheduled', 'draft'] }
  }).toArray();
  
  console.log('\n=== Pending Scheduled Runs ===');
  console.log('Count:', pendingScheduled.length);
  pendingScheduled.forEach(r => {
    console.log('---');
    console.log('ID:', r._id.toString());
    console.log('Name:', r.name);
    console.log('Status:', r.status);
    console.log('ScheduledAt:', r.scheduledAt);
    console.log('Stats:', JSON.stringify(r.stats));
  });
  
  // Check messages for recent run
  if (runs.length > 0) {
    const latestRun = runs[0];
    const messages = await crmDb.collection('broadcast_run_messages').find({
      runId: latestRun._id
    }).limit(5).toArray();
    
    console.log('\n=== Messages for Latest Run ===');
    console.log('Run ID:', latestRun._id.toString());
    console.log('Message Count Sample:', messages.length);
    messages.forEach(m => {
      console.log('  -', m.phoneNumber, '|', m.status, '|', m.failureReason || 'N/A');
    });
    
    // Count by status
    const statusCounts = await crmDb.collection('broadcast_run_messages').aggregate([
      { $match: { runId: latestRun._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log('\nStatus breakdown:', statusCounts);
  }
  
  await mongoose.disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
