const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function update() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Update template to match exactly what's on Meta
  const result = await db.collection('whatsapptemplates').updateOne(
    { templateName: 'swaryogabesic' },
    { 
      $set: {
        language: 'en',
        templateContent: '*Swar Yoga Basic Program*\nIts Two days Program daily 2 hours, \nDate: *2nd and 3rd* Feb-26\nTime: 7.00 To 9.00 PM\nIts complete Health \n@ just 145/- Rs',
        footerText: 'Swar Yoga Team',
        buttons: [
          {
            kind: 'quick_reply',
            title: 'I am Interested'
          }
        ],
        updatedAt: new Date()
      }
    }
  );
  
  console.log('Updated:', result.modifiedCount);
  
  // Verify
  const template = await db.collection('whatsapptemplates').findOne({ templateName: 'swaryogabesic' });
  console.log('Template now:', JSON.stringify(template, null, 2));
  
  await client.close();
}

update().catch(console.error);
