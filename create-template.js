const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function create() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Create template that matches Meta's approved template
  const template = {
    templateName: 'swaryogabesic',
    metaTemplateName: 'swaryogabesic',
    language: 'en',
    headerFormat: 'IMAGE',
    headerContent: 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg',
    headerMedia: {
      kind: 'image',
      url: 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg'
    },
    templateContent: 'Discover the Life-Changing Power of Swar Yoga! unlock the powerful secrets of swar yoga, an ancient practice of breath science that empowers you to make better decisions, improve health, and align with cosmic energy.',
    footerText: '',
    buttons: [
      {
        kind: 'url',
        title: 'Learn',
        url: 'https://swaryoga.com/'
      }
    ],
    status: 'approved',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await db.collection('whatsapptemplates').insertOne(template);
  console.log('Created template with ID:', result.insertedId);
  
  // Verify
  const saved = await db.collection('whatsapptemplates').findOne({ _id: result.insertedId });
  console.log('Saved template:', JSON.stringify(saved, null, 2));
  
  await client.close();
}

create().catch(console.error);
