const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('MONGODB_URI_MAIN not set');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    const col = db.collection('whatsapp_messages');
    
    console.log('Fetching 10 most recent inbound messages...');
    const messages = await col.find({ direction: 'inbound' })
      .sort({ sentAt: -1 })
      .limit(10)
      .toArray();
    
    messages.forEach(m => {
      console.log(`[${m.sentAt}] ${m.phoneNumber} (${m.provider}): ${m.messageContent?.substring(0, 50)}`);
    });

    const leadId = messages.length > 0 ? messages[0].leadId : null;
    if (leadId) {
      console.log('\nChecking if lead exists for most recent message:');
      const leads = db.collection('leads');
      const lead = await leads.findOne({ _id: leadId });
      console.log('Lead found:', lead ? 'Yes' : 'No', lead ? lead.name : '');
    }

  } finally {
    await client.close();
  }
}

run().catch(console.error);
