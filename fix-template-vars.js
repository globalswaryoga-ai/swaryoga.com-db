/**
 * Fix template variables to use Meta-compliant format
 * Meta requires: {{profile_id}} not {{1}}
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function fix() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  const newContent = `Welcome to Swar Yoga!

Your account has been created successfully.

Your Login Credentials:
Profile ID: {{profile_id}}
Email: {{email}}
Password: {{password}}

Login here: https://swaryoga.com/signin

Please save these credentials safely.

Har Har Mahadev`;

  const newVariables = [
    { name: 'profile_id', description: 'Profile ID (6 digits)', example: '518520' },
    { name: 'email', description: 'Email address', example: 'user@example.com' },
    { name: 'password', description: 'Password', example: 'moha6820@#' }
  ];

  const result = await db.collection('whatsapp_templates').updateOne(
    { templateName: 'user_credentials_notification' },
    { 
      $set: { 
        templateContent: newContent,
        variables: newVariables,
        status: 'draft',
        metaTemplateId: null,
        metaStatus: null,
        updatedAt: new Date()
      }
    }
  );
  
  console.log('✅ Template updated with Meta-compliant variable format');
  console.log('   Variables: {{profile_id}}, {{email}}, {{password}}');
  console.log('   Modified:', result.modifiedCount);
  
  await client.close();
}

fix().catch(console.error);
