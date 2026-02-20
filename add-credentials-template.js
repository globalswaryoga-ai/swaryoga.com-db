/**
 * Add User Credentials Notification Template to CRM
 * This is a UTILITY template - auto-approved by Meta
 * 
 * Run: node add-credentials-template.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function addTemplate() {
  // Connect to CRM database
  const crmUri = process.env.MONGODB_URI_MAIN.replace(/\/[^/]+\?/, '/' + (process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm') + '?');
  await mongoose.connect(crmUri);
  console.log('✅ Connected to CRM database');
  
  const WhatsAppTemplate = mongoose.connection.collection('whatsapp_templates');
  
  // Check if template already exists
  const existing = await WhatsAppTemplate.findOne({ templateName: 'user_credentials_notification' });
  if (existing) {
    console.log('⚠️ Template already exists:', existing.templateName, '| Status:', existing.status);
    await mongoose.disconnect();
    return;
  }
  
  // Template data for UTILITY category
  const template = {
    templateName: 'user_credentials_notification',
    category: 'UTILITY',
    language: 'en',
    provider: 'meta',
    status: 'draft', // Will change to pending_approval after submit
    
    // Body with 3 variables: {{profile_id}}, {{email}}, {{password}}
    templateContent: `Welcome to Swar Yoga!

Your account has been created successfully.

Your Login Credentials:
Profile ID: {{profile_id}}
Email: {{email}}
Password: {{password}}

Login here: https://swaryoga.com/signin

Please save these credentials safely.

Har Har Mahadev`,
    
    // No header (TEXT only template)
    headerFormat: null,
    headerContent: null,
    footerText: null,
    buttons: [],
    
    // Variable definitions
    variables: [
      { name: 'profile_id', description: 'Profile ID (6 digits)', example: '518520' },
      { name: 'email', description: 'Email address', example: 'user@example.com' },
      { name: 'password', description: 'Password', example: 'moha6820@#' },
    ],
    
    // Meta submission tracking
    metaTemplateId: null,
    metaTemplateName: null,
    metaStatus: null,
    submittedToMetaAt: null,
    
    // Timestamps
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const result = await WhatsAppTemplate.insertOne(template);
  
  console.log('✅ Template created successfully!');
  console.log('   ID:', result.insertedId);
  console.log('   Name:', template.templateName);
  console.log('   Category:', template.category);
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Go to CRM → Templates');
  console.log('   2. Find "user_credentials_notification"');
  console.log('   3. Click "Submit to Meta"');
  console.log('   4. Template will be auto-approved (UTILITY category)');
  
  await mongoose.disconnect();
}

addTemplate().catch(console.error);
