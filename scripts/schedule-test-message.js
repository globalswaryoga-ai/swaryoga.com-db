require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function scheduleTest() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  const now = new Date();
  const oneMinuteLater = new Date(now.getTime() + 60 * 1000);
  
  console.log('Current time:', now.toISOString());
  console.log('Scheduled time:', oneMinuteLater.toISOString());
  
  // Get the feb_hindi_mor template
  const template = await mongoose.connection.db.collection('whatsapp_templates').findOne({ templateName: 'feb_hindi_mor' });
  if (!template) {
    console.log('Template not found!');
    process.exit(1);
  }
  
  console.log('Found template:', template.templateName);
  
  // Create a broadcast run scheduled for 1 minute from now
  const run = {
    name: 'Test Schedule - 1 min',
    status: 'scheduled',
    provider: 'meta',
    templateId: template._id,
    templateSnapshot: {
      templateName: template.templateName,
      headerFormat: template.headerFormat,
      headerMedia: template.headerMedia,
      templateContent: template.templateContent,
      buttons: template.buttons,
      language: template.language,
    },
    recipients: ['919309986820'],
    stats: {
      total: 1,
      pending: 1,
      sent: 0,
      failed: 0,
      skipped: 0,
    },
    scheduledAt: oneMinuteLater,
    createdAt: now,
    createdByUserId: 'admin',
  };
  
  const result = await mongoose.connection.db.collection('broadcastruns').insertOne(run);
  console.log('Broadcast run created:', result.insertedId);
  
  // Create the message entry
  const message = {
    runId: result.insertedId,
    phoneNumber: '919309986820',
    status: 'pending',
    createdAt: now,
  };
  
  await mongoose.connection.db.collection('broadcastrunmessages').insertOne(message);
  console.log('Message entry created for 919309986820');
  
  console.log('\n✅ Scheduled! Message will be sent at:', oneMinuteLater.toLocaleTimeString());
  console.log('Run ID:', result.insertedId.toString());
  
  await mongoose.disconnect();
}
scheduleTest();
