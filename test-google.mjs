import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testGoogle() {
  console.log('==========================================');
  console.log('🧪 TESTING GOOGLE INTEGRATION');
  console.log('==========================================\n');
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error('❌ Missing Google credentials in .env.local');
    return;
  }

  try {
    console.log('1️⃣ Testing Authentication with Google Cloud...');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });

    const client = await auth.getClient();
    console.log('✅ Successfully authenticated with Google Cloud!');
    console.log(`   Connected as: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}\n`);
    
    console.log('2️⃣ Testing Google Forms Webhook (saving to Bunny)...');
    const response = await fetch('http://localhost:3000/api/webhooks/google-forms-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formId: 'test_form_123',
        responses: { 
          Name: 'Test Automation', 
          Email: 'test@swaryoga.com',
          Message: 'This is a test from the terminal!'
        }
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('✅ Webhook successfully received data!');
      console.log(`✅ Data securely backed up to Bunny Storage at: \n   ${result.storageUrl}\n`);
      console.log('🎉 ALL TESTS PASSED! The Google system is fully operational.');
    } else {
      console.error('❌ Webhook test failed:', result);
    }

  } catch (error) {
    console.error('❌ Error testing Google Integration:', error.message);
  }
}

testGoogle();
