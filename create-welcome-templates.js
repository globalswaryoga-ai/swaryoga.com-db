/**
 * Create welcome templates for Meta approval
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function create() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Simple welcome message - NO variables = easy approval
  const templates = [
    {
      templateName: 'welcome_new_user',
      category: 'UTILITY',  // UTILITY for account-related
      language: 'en',
      provider: 'meta',
      status: 'draft',
      templateContent: `Welcome to Swar Yoga!

Your account has been created successfully.

Login at https://swaryoga.com/signin with the credentials sent to your email.

Har Har Mahadev 🙏`,
      headerFormat: null,
      headerContent: null,
      footerText: null,
      buttons: [],
      variables: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      templateName: 'account_credentials',
      category: 'UTILITY',
      language: 'en',
      provider: 'meta',
      status: 'draft',
      // Meta-compliant variables: lowercase with underscores
      templateContent: `Welcome to Swar Yoga!

Your account has been created.

Your Login Details:
User ID: {{user_id}}
Email: {{user_email}}
Password: {{user_password}}

Login: https://swaryoga.com/signin

Save these credentials safely.`,
      headerFormat: null,
      headerContent: null,
      footerText: null,
      buttons: [],
      variables: [
        { name: 'user_id', description: 'User ID', example: '518520' },
        { name: 'user_email', description: 'Email', example: 'test@example.com' },
        { name: 'user_password', description: 'Password', example: 'test1234@#' }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const template of templates) {
    const existing = await db.collection('whatsapp_templates').findOne({ 
      templateName: template.templateName 
    });
    
    if (existing) {
      await db.collection('whatsapp_templates').updateOne(
        { templateName: template.templateName },
        { $set: template }
      );
      console.log('✅ Updated:', template.templateName);
    } else {
      await db.collection('whatsapp_templates').insertOne(template);
      console.log('✅ Created:', template.templateName);
    }
  }
  
  console.log('\n📋 Submit these in Meta Business Suite:');
  console.log('   Category: UTILITY (for account notifications)');
  console.log('   welcome_new_user - No variables, easy approval');
  console.log('   account_credentials - Has variables, may need review');
  
  await client.close();
}

create().catch(console.error);
