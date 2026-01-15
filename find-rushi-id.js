require('dotenv').config({ path: '/Users/mohankalburgi/swaryoga.com-db/.env.local' });

const { MongoClient } = require('mongodb');

async function findRushi() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  try {
    await client.connect();

    const db = client.db(process.env.MONGODB_DB_NAME || 'swaryogaDB');
    const crmDb = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    console.log('\n=== Searching for Rushi Kalburgi ===\n');

    // Search in main DB
    console.log('Checking main DB...');
    let lead = await db.collection('leads').findOne({
      $or: [
        { name: /Rushi/i },
        { name: /kalburgi/i },
      ]
    });
    if (lead) {
      console.log('Found in main DB:', {
        _id: lead._id?.toString(),
        leadNumber: lead.leadNumber,
        name: lead.name,
        phoneNumber: lead.phoneNumber,
      });
    } else {
      console.log('Not found in main DB leads');
    }

    // Search in CRM DB
    console.log('\nChecking CRM DB...');
    lead = await crmDb.collection('leads').findOne({
      $or: [
        { name: /Rushi/i },
        { name: /kalburgi/i },
      ]
    });
    if (lead) {
      console.log('Found in CRM DB:', {
        _id: lead._id?.toString(),
        leadNumber: lead.leadNumber,
        name: lead.name,
        phoneNumber: lead.phoneNumber,
      });
    } else {
      console.log('Not found in CRM DB leads');
    }

    // Search by leadNumber 007132
    console.log('\nSearching for leadNumber "007132"...');
    lead = await crmDb.collection('leads').findOne({ leadNumber: '007132' });
    if (lead) {
      console.log('Found:', {
        _id: lead._id?.toString(),
        leadNumber: lead.leadNumber,
        name: lead.name,
        phoneNumber: lead.phoneNumber,
      });
    } else {
      console.log('Not found');
    }

    // Search for eda1c1
    console.log('\nSearching for "eda1c1"...');
    let results = await crmDb.collection('leads').find({
      $or: [
        { _id: { $eq: 'eda1c1' } },
        { leadNumber: 'eda1c1' },
      ]
    }).limit(5).toArray();
    if (results.length > 0) {
      console.log('Found:', results);
    } else {
      console.log('Not found in any field');
      // Try searching in message logs
      const msgs = await crmDb.collection('whatsapp_messages').find({ userId: 'eda1c1' }).limit(1).toArray();
      if (msgs.length > 0) {
        console.log('Found as userId in whatsapp_messages');
      }
    }

  } finally {
    await client.close();
  }
}

findRushi();
