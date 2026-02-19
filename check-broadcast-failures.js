require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function checkFailures() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Get recent broadcast runs with their messages
  const recentRuns = await db.collection('broadcast_runs')
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('=== RECENT BROADCAST RUNS ===\n');
  
  for (const run of recentRuns) {
    console.log('Run:', run.name);
    console.log('  ID:', run._id);
    console.log('  Status:', run.status);
    console.log('  Provider:', run.provider || 'meta(default)');
    console.log('  Template ID:', run.templateId);
    console.log('  Scheduled:', run.scheduledAt);
    console.log('  Stats:', JSON.stringify(run.stats));
    console.log('  Last Error:', run.lastError || 'none');
    
    // Check messages for this run
    const msgs = await db.collection('broadcast_run_messages')
      .find({ runId: run._id })
      .limit(5)
      .toArray();
    
    if (msgs.length > 0) {
      console.log('  Messages (' + msgs.length + '):');
      msgs.forEach(m => {
        console.log('    - Phone:', m.to || m.phone);
        console.log('      Status:', m.status);
        console.log('      Error:', m.failureReason || m.error || 'none');
      });
    }
    
    // Check if template exists
    if (run.templateId) {
      const template = await db.collection('whatsapp_templates')
        .findOne({ _id: new ObjectId(run.templateId) });
      if (template) {
        console.log('  Template Found:', template.templateName);
        console.log('    Meta Template ID:', template.metaTemplateId || 'NOT SUBMITTED');
        console.log('    Meta Status:', template.metaStatus || 'N/A');
      } else {
        console.log('  ⚠️ TEMPLATE NOT FOUND!');
      }
    }
    
    console.log('---\n');
  }
  
  await client.close();
}

checkFailures().catch(console.error);
