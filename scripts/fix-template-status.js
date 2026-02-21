require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  // Check current status
  const template = await mongoose.connection.db.collection('whatsapp_templates').findOne({ templateName: 'feb_hindi_mor' });
  console.log('Current status:', template?.status);
  console.log('Current metaStatus:', template?.metaStatus);
  
  // Update to approved since we know it works
  const result = await mongoose.connection.db.collection('whatsapp_templates').updateOne(
    { templateName: 'feb_hindi_mor' },
    { 
      $set: { 
        status: 'approved',
        metaStatus: 'APPROVED'
      }
    }
  );
  
  console.log('Updated:', result.modifiedCount, 'record(s)');
  
  // Verify
  const updated = await mongoose.connection.db.collection('whatsapp_templates').findOne({ templateName: 'feb_hindi_mor' });
  console.log('New status:', updated?.status);
  console.log('New metaStatus:', updated?.metaStatus);
  
  await mongoose.disconnect();
}
fix();
