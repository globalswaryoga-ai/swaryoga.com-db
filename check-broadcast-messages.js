const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN || 'mongodb+srv://mohan:nA4xLLpxL1kxHe2O@cluster0.ydq4q.mongodb.net/swaryoga_admin_crm?retryWrites=true&w=majority&appName=Cluster0');
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Get the most recent broadcast runs
  const runs = await db.collection('broadcastruns').find({}).sort({ createdAt: -1 }).limit(5).toArray();
  
  for (const run of runs) {
    console.log('\n========================================');
    console.log('Run:', run._id);
    console.log('Template:', run.templateName);
    console.log('Status:', run.status);
    console.log('Created:', run.createdAt);
    console.log('Stats:', JSON.stringify(run.stats || {}));
    
    // Get messages for this run
    const messages = await db.collection('broadcastrunmessages').find({ runId: run._id }).toArray();
    console.log('\nMessages (' + messages.length + '):');
    messages.forEach(m => {
      console.log('  Phone:', m.phone);
      console.log('    Status:', m.status);
      console.log('    waMessageId:', m.waMessageId || 'NOT SET');
      console.log('    sentAt:', m.sentAt);
      console.log('    deliveredAt:', m.deliveredAt);
      console.log('    readAt:', m.readAt);
      console.log('    failureReason:', m.failureReason || '-');
      console.log('');
    });
  }
  
  await client.close();
}

check().catch(console.error);
