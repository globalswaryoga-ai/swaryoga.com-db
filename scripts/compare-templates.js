const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function compare() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Compare working vs failing template
  const working = await db.collection('whatsapp_templates').findOne({ templateName: 'swaryogabasic' });
  const failing = await db.collection('whatsapp_templates').findOne({ templateName: 'feb_hindi_mor' });
  
  console.log('=== WORKING: swaryogabasic ===');
  if (working) {
    console.log('Category:', working.category);
    console.log('HeaderFormat:', working.headerFormat);
    console.log('Language:', working.language);
    console.log('MetaTemplateId:', working.metaTemplateId);
    console.log('Buttons:', working.buttons?.length || 0);
    console.log('Status:', working.status);
    console.log('HeaderMedia:', working.headerMedia);
    console.log('HeaderContent:', working.headerContent);
  } else {
    console.log('NOT FOUND');
  }
  
  console.log('\n=== FAILING: feb_hindi_mor ===');
  if (failing) {
    console.log('Category:', failing.category);
    console.log('HeaderFormat:', failing.headerFormat);
    console.log('Language:', failing.language);
    console.log('MetaTemplateId:', failing.metaTemplateId);
    console.log('Buttons:', failing.buttons?.length || 0);
    console.log('Status:', failing.status);
    console.log('HeaderMedia:', failing.headerMedia);
    console.log('HeaderContent:', failing.headerContent);
  } else {
    console.log('NOT FOUND');
  }
  
  process.exit(0);
}

compare();
