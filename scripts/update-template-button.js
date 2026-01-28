// Update template button with kind property
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Update the button to have kind: 'quick_reply'
  const result = await db.collection('whatsapp_templates').updateOne(
    { templateName: 'swaryogabesic' },
    { 
      $set: { 
        'buttons.0.kind': 'quick_reply'
      }
    }
  );
  
  console.log('Updated:', result.modifiedCount);
  
  // Verify
  const template = await db.collection('whatsapp_templates').findOne({ templateName: 'swaryogabesic' });
  console.log('Buttons after update:', JSON.stringify(template.buttons, null, 2));
  
  await client.close();
}
main().catch(console.error);
