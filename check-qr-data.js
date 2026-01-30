require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkQRData() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  console.log('\n📊 QR BROADCAST DATA CHECK\n');
  
  // Check recent QR broadcast runs
  const runs = await db.collection('broadcast_runs').find({ provider: 'qr' }).sort({ createdAt: -1 }).limit(10).toArray();
  console.log(`Found ${runs.length} QR broadcast runs:\n`);
  
  for (const r of runs) {
    console.log(`📌 ${r.name}`);
    console.log(`   Status: ${r.status}`);
    console.log(`   Stats: Total=${r.stats?.total || 0}, Sent=${r.stats?.sent || 0}, Delivered=${r.stats?.delivered || 0}, Failed=${r.stats?.failed || 0}, Pending=${r.stats?.pending || 0}`);
    console.log(`   Created: ${r.createdAt}`);
    console.log('');
  }
  
  // Total counts
  const totalRuns = await db.collection('broadcast_runs').countDocuments({ provider: 'qr' });
  const totalMsgs = await db.collection('broadcast_run_messages').countDocuments();
  console.log(`📈 Totals: ${totalRuns} QR runs, ${totalMsgs} broadcast messages`);
  
  // Check if any messages have delivery status
  if (runs.length > 0) {
    const msgs = await db.collection('broadcast_run_messages').find({ runId: runs[0]._id }).toArray();
    console.log(`\n📱 Messages from latest run "${runs[0].name}":`);
    msgs.forEach(m => {
      console.log(`   ${m.phoneNumber} | ${m.status} | Sent: ${m.sentAt || 'N/A'} | Delivered: ${m.deliveredAt || 'N/A'}`);
    });
  }
  
  await client.close();
}

checkQRData().catch(console.error);
