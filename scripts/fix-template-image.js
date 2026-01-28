#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function fixTemplate() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  console.log('Connected to MongoDB');
  
  const db = client.db(process.env.MONGODB_CRM_DB_NAME);
  
  // Get the template
  const template = await db.collection('whatsapp_templates').findOne({ templateName: 'Swar Yoga Basic' });
  
  if (!template) {
    console.log('Template not found!');
    await client.close();
    return;
  }
  
  console.log('Found template:', template.templateName);
  console.log('Current imageFile:', JSON.stringify(template.imageFile, null, 2));
  console.log('headerContent:', template.headerContent);
  
  // Fix: If headerContent has S3 URL but imageFile.url is missing, fix it
  const s3Url = template.headerContent;
  if (s3Url && s3Url.includes('s3.') && s3Url.includes('amazonaws.com')) {
    const result = await db.collection('whatsapp_templates').updateOne(
      { _id: template._id },
      { 
        $set: { 
          'imageFile.url': s3Url,
          'imageFile.fileName': 'template-image.jpg',
          'imageFile.mimeType': 'image/jpeg'
        }
      }
    );
    console.log('Update result:', result.modifiedCount, 'document(s) modified');
    console.log('FIXED! Moved S3 URL to imageFile.url');
  } else {
    console.log('No S3 URL found in headerContent');
  }
  
  // Verify
  const updated = await db.collection('whatsapp_templates').findOne({ _id: template._id });
  console.log('\nUpdated imageFile:', JSON.stringify(updated.imageFile, null, 2));
  
  await client.close();
  console.log('Done!');
}

fixTemplate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
