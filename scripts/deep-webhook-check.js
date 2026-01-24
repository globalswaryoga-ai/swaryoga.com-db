const { MongoClient } = require('mongodb');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const uri = env.match(/MONGODB_URI_MAIN=(.+)/)?.[1] || env.match(/MONGODB_URI=(.+)/)?.[1];

async function check() {
  const client = new MongoClient(uri);
  await client.connect();
  
  // Check CRM database for ALL collections
  const crmDb = client.db('swaryoga_admin_crm');
  const collections = await crmDb.listCollections().toArray();
  console.log('=== CRM COLLECTIONS ===');
  for (const col of collections) {
    const count = await crmDb.collection(col.name).countDocuments();
    console.log(col.name + ':', count);
  }
  
  // Check for any recent documents in whatsapp-related collections
  console.log('\n=== LAST 10 MINUTES OF ANY WHATSAPP DATA ===');
  const tenMinAgo = new Date(Date.now() - 10*60*1000);
  
  for (const col of collections) {
    if (col.name.includes('whatsapp') || col.name.includes('webhook') || col.name.includes('message')) {
      const recent = await crmDb.collection(col.name).find({
        createdAt: { $gte: tenMinAgo }
      }).sort({createdAt: -1}).limit(5).toArray();
      if (recent.length > 0) {
        console.log('\n' + col.name + ' (' + recent.length + ' recent):');
        recent.forEach(d => {
          const time = d.createdAt ? d.createdAt.toISOString() : 'no time';
          console.log('  -', time, d.eventType || d.kind || d.from || 'unknown');
        });
      }
    }
  }
  
  // Also check swaryogaDB for any webhook logs
  console.log('\n=== CHECKING MAIN DB FOR WEBHOOKS ===');
  const mainDb = client.db('swaryogaDB');
  const mainCols = await mainDb.listCollections().toArray();
  for (const col of mainCols) {
    if (col.name.includes('webhook') || col.name.includes('log')) {
      const count = await mainDb.collection(col.name).countDocuments();
      console.log(col.name + ':', count);
    }
  }
  
  await client.close();
}

check().catch(console.error);
