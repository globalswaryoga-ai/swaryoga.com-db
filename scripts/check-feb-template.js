const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkFebTemplate() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  const template = await mongoose.connection.collection('whatsapp_templates')
    .findOne({ templateName: 'feb_hindi_mor' });
  
  if (!template) {
    console.log('Template feb_hindi_mor not found!');
  } else {
    console.log('=== Template: feb_hindi_mor ===');
    console.log('_id:', template._id);
    console.log('templateName:', template.templateName);
    console.log('language:', template.language);
    console.log('status:', template.status);
    console.log('headerFormat:', template.headerFormat);
    console.log('imageFile:', JSON.stringify(template.imageFile, null, 2));
    console.log('headerMedia:', JSON.stringify(template.headerMedia, null, 2));
    console.log('buttons:', JSON.stringify(template.buttons, null, 2));
    console.log('footerText:', template.footerText);
    console.log('templateContent:', (template.templateContent || '').substring(0, 100) + '...');
  }
  
  await mongoose.disconnect();
}

checkFebTemplate().catch(console.error);
