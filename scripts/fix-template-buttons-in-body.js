/**
 * Fix duplicate button issue in existing templates
 * Removes button text markers from templateContent
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

function cleanTemplateContent(content) {
  if (!content) return content;
  return content
    .replace(/•\s*\[QUICK_REPLY\][^\n]*/gi, '')
    .replace(/•\s*\[URL\][^\n]*/gi, '')
    .replace(/•\s*\[PHONE_NUMBER\][^\n]*/gi, '')
    .replace(/•\s*\[COPY_CODE\][^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { dbName: CRM_DB });
  console.log('Connected to', CRM_DB);

  const WhatsAppTemplate = mongoose.connection.collection('whatsapptemplates');
  const templates = await WhatsAppTemplate.find({}).toArray();
  console.log('Found', templates.length, 'templates');

  let updated = 0;
  for (const t of templates) {
    const original = t.templateContent || '';
    const cleaned = cleanTemplateContent(original);
    if (original !== cleaned) {
      console.log('Fixing:', t.templateName);
      await WhatsAppTemplate.updateOne({ _id: t._id }, { $set: { templateContent: cleaned } });
      updated++;
    }
  }

  console.log('Updated:', updated, 'templates');
  console.log('NOTE: Re-submit templates to Meta if they were already approved');
  await mongoose.disconnect();
}

main().catch(console.error);
