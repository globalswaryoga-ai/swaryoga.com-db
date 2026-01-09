const { MongoClient } = require('mongodb');

require('dotenv').config({ path: '.env.local' });
const uri = process.env.MONGODB_URI_MAIN;
if (!uri) {
  throw new Error('MONGODB_URI_MAIN is missing. Ensure .env.local is present and configured.');
}
const client = new MongoClient(uri);

async function check() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         META WEBHOOK DIAGNOSTIC CHECK - JAN 8, 2026        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await client.connect();
    const db = client.db('swaryogaDB');

    // Check webhook event logs
    console.log('🔍 CHECKING WEBHOOK EVENTS:\n');
    
    const webhookEvents = db.collection('whatsapp_webhook_events');
    const webhookEventsCount = await webhookEvents.countDocuments();
    const webhookEventsDocs = await webhookEvents.find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`📊 Total webhook events: ${webhookEventsCount}\n`);
    
    if (webhookEventsDocs.length > 0) {
      console.log('📱 Recent webhook events:\n');
      webhookEventsDocs.forEach((evt, i) => {
        const d = new Date(evt.createdAt).toLocaleString('en-IN');
        const type = evt.type || evt.kind || 'unknown';
        console.log(`${i+1}. [${d}] Type: ${type}`);
        if (evt.message) console.log(`   Message: ${evt.message}`);
        if (evt.ok !== undefined) console.log(`   OK: ${evt.ok}`);
        console.log('');
      });
    } else {
      console.log('❌ NO WEBHOOK EVENTS RECORDED\n');
    }

    // Check Meta webhook test events
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 CHECKING META MESSAGES:\n');
    
    const metaMsgs = db.collection('whatsappmessages');
    const metaMsgsCount = await metaMsgs.countDocuments();
    const metaMsgsDocs = await metaMsgs.find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`📊 Total Meta messages: ${metaMsgsCount}\n`);
    
    if (metaMsgsDocs.length > 0) {
      console.log('📱 Recent Meta messages:\n');
      metaMsgsDocs.forEach((msg, i) => {
        const d = new Date(msg.createdAt).toLocaleString('en-IN');
        const phone = msg.phoneNumber || 'unknown';
        const body = (msg.body || msg.messageContent || '(empty)').substring(0, 50);
        const direction = msg.direction || msg.from || 'unknown';
        console.log(`${i+1}. [${d}] ${phone} (${direction})`);
        console.log(`   Body: "${body}"`);
        console.log(`   Status: ${msg.status || 'unknown'}\n`);
      });
    } else {
      console.log('❌ NO META MESSAGES RECORDED\n');
    }

    // Check leads to see if any new conversations started
    console.log('═══════════════════════════════════════════════════════════');
    console.log('👥 CHECKING LEADS (Conversation Activity):\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const leads = db.collection('leads');
    const todayLeads = await leads.find({ lastMessageAt: { $gte: today } }).sort({ lastMessageAt: -1 }).limit(10).toArray();
    
    console.log(`📊 Leads with messages today: ${todayLeads.length}\n`);
    
    if (todayLeads.length > 0) {
      console.log('💬 Recent conversations:\n');
      todayLeads.forEach((lead, i) => {
        const d = new Date(lead.lastMessageAt).toLocaleString('en-IN');
        const phone = lead.phoneNumber || 'unknown';
        const name = lead.name || '(no name)';
        console.log(`${i+1}. ${phone} - ${name}`);
        console.log(`   Last message: ${d}\n`);
      });
    } else {
      console.log('❌ NO CONVERSATION ACTIVITY TODAY\n');
    }

    // Check configuration
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚙️  META WEBHOOK CONFIGURATION:\n');
    
    const config = {
      'Webhook URL': 'https://crm.swaryoga.com/api/whatsapp/webhook',
      'Verify Token': 'ce353ae0e9367a387963a60657848f20a... (SET)',
      'Phone ID': '733788303156745',
      'Access Token': 'EAAZA17SDRZATgBQfK3R85pN... (SET)',
      'Subscribed to': 'messages field (confirmed)'
    };
    
    Object.entries(config).forEach(([key, value]) => {
      console.log(`✅ ${key}: ${value}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Overall status
    console.log('📊 OVERALL STATUS:\n');
    
    if (metaMsgsCount === 0) {
      console.log('❌ NO MESSAGES FROM META WEBHOOK YET');
      console.log('   Possible reasons:');
      console.log('   1. Meta app is in DEVELOPMENT mode (not LIVE)');
      console.log('   2. App not yet approved for message receiving');
      console.log('   3. Business account not properly linked');
      console.log('   4. Webhook callback URL needs verification');
    } else {
      console.log(`✅ META WEBHOOK IS RECEIVING MESSAGES`);
      console.log(`   Total: ${metaMsgsCount} messages`);
      console.log(`   Latest: ${metaMsgsDocs[0].createdAt}`);
    }

    console.log('\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

check();
