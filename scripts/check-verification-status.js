const { MongoClient } = require('mongodb');

async function check() {
  const uri = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const crmDb = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    
    // Check verification events
    const events = await crmDb.collection('whatsapp_webhook_events')
      .find({ kind: 'verify' })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    console.log('=== RECENT VERIFICATION ATTEMPTS ===\n');
    if (events.length === 0) {
      console.log('❌ NO VERIFICATION ATTEMPTS FOUND!');
      console.log('\nThis means Meta Dashboard has NOT called your webhook verification endpoint.');
      console.log('\n🔧 WHAT TO DO:');
      console.log('1. Go to: https://developers.facebook.com');
      console.log('2. Select app: Swar Yoga');
      console.log('3. Go to: Settings → Basic → Webhooks');
      console.log('4. Find your webhook');
      console.log('5. Verify URL is: https://crm.swaryoga.com/api/whatsapp/webhook');
      console.log('6. Verify Token is: SWAR_YOGA_MOHAN_WT_SETUP');
      console.log('7. IMPORTANT: Click "Test" button to trigger verification');
      console.log('8. Wait for green checkmark ✅');
    } else {
      console.log(`✅ Found ${events.length} verification attempts\n`);
      events.forEach((e, i) => {
        console.log(`${i+1}. ${new Date(e.timestamp).toLocaleString()}`);
        console.log(`   Message: ${e.message}`);
        console.log(`   Status: ${e.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
      });
    }
    
    // Check recent messages
    console.log('\n=== RECENT INBOUND MESSAGES (from phone 919309986820) ===\n');
    const messages = await crmDb.collection('whatsapp_messages')
      .find({ phoneNumber: '919309986820' })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
    
    if (messages.length === 0) {
      console.log('❌ NO MESSAGES FROM 919309986820');
      console.log('\nWhy no messages?');
      console.log('→ Webhook verification not complete');
      console.log('→ Meta doesn\'t know to send messages to your endpoint');
      console.log('\n✅ NEXT STEP: Complete webhook verification (see above)');
    } else {
      console.log(`✅ Found ${messages.length} messages from 919309986820\n`);
      messages.forEach((m, i) => {
        console.log(`${i+1}. ${new Date(m.timestamp).toLocaleString()}`);
        console.log(`   Text: ${m.text}`);
        console.log(`   Type: ${m.type || 'text'}`);
      });
    }
    
    // Check all recent POST events
    console.log('\n=== ALL RECENT WEBHOOK POSTS (last 10) ===\n');
    const posts = await crmDb.collection('whatsapp_webhook_events')
      .find({ kind: 'post' })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    console.log(`Found ${posts.length} recent POST events`);
    posts.forEach((p, i) => {
      console.log(`${i+1}. ${new Date(p.timestamp).toLocaleString()} - ${p.message}`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

check();
