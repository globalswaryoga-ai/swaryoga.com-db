const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
const uri = process.env.MONGODB_URI_MAIN;
if (!uri) {
  throw new Error('MONGODB_URI_MAIN is missing. Ensure .env.local is present and configured.');
}

async function run() {
  const client = new MongoClient(uri);
  try {
    const db = client.db('swaryoga_admin_crm');
    
    // Test: Get a few recent inbound messages with full details
    const messages = await db.collection('whatsapp_messages').find({
      direction: 'inbound',
      provider: 'meta'
    }).sort({ sentAt: -1 }).limit(10).toArray();
    
    console.log(`Found ${messages.length} recent inbound messages:\n`);
    messages.forEach((msg, i) => {
      console.log(`${i+1}. From: ${msg.phoneNumber} | Body: "${msg.messageContent}" | Status: ${msg.status}`);
    });
    
    // Test the aggregation pipeline like the CRM does
    console.log('\n--- Testing CRM Aggregation Pipeline ---');
    const pipeline = [
      { 
        $match: { 
          provider: { $in: ['meta', 'whatsapp_web_bridge'] }
        } 
      },
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: '$leadId',
          lastMessageAt: { $first: '$sentAt' },
          lastMessageContent: { $first: '$messageContent' },
          lastDirection: { $first: '$direction' },
          lastStatus: { $first: '$status' },
          phoneNumber: { $first: '$phoneNumber' },
        },
      },
      { $limit: 5 }
    ];
    
    const aggregated = await db.collection('whatsapp_messages').aggregate(pipeline).toArray();
    console.log(`\nAggregated ${aggregated.length} conversations:`);
    aggregated.forEach((conv, i) => {
      console.log(`${i+1}. Phone: ${conv.phoneNumber} | Last: "${conv.lastMessageContent}" | ${conv.lastDirection}`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
