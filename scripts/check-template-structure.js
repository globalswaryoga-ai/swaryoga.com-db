const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const templates = await db.collection('whatsapptemplates').find({}).toArray();
  
  console.log('\n📋 TEMPLATES WITH IMAGE + BODY + BUTTON:\n');
  
  templates.forEach(t => {
    const hasImage = t.headerFormat === 'IMAGE' || t.headerMedia?.kind === 'image';
    const hasBody = t.templateContent?.length > 0;
    const hasButton = t.buttons?.length > 0;
    
    console.log('Template:', t.templateName);
    console.log('  📷 Image:', hasImage ? '✅ ' + (t.headerMedia?.url?.substring(0,60) || 'URL missing') : '❌');
    console.log('  📝 Body:', hasBody ? '✅ ' + t.templateContent?.substring(0,50) + '...' : '❌');
    console.log('  🔘 Button:', hasButton ? '✅ ' + JSON.stringify(t.buttons) : '❌');
    console.log('  🌐 Language:', t.language);
    console.log('');
  });
  
  await mongoose.disconnect();
}
check().catch(console.error);
