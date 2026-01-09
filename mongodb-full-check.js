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
    console.log('║         COMPREHENSIVE MONGODB CHECK - JAN 8, 2026          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await client.connect();
    const db = client.db('swaryogaDB');

    // 1. Get all collections
    console.log('📚 STEP 1: ALL COLLECTIONS IN DATABASE\n');
    const collections = await db.listCollections().toArray();
    const collNames = collections.map(c => c.name);
    console.log('Total collections: ' + collNames.length + '\n');

    // 2. Check message-related collections
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📱 MESSAGE COLLECTIONS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const msgCollections = ['whatsapp_messages', 'whatsappmessages', 'messages', 'chatbot_flows'];
    
    for (const colName of msgCollections) {
      if (collNames.includes(colName)) {
        const col = db.collection(colName);
        const total = await col.countDocuments();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = await col.countDocuments({ createdAt: { $gte: today } });
        
        console.log(`✅ ${colName}`);
        console.log(`   Total documents: ${total}`);
        console.log(`   Today's documents: ${todayCount}`);
        
        if (total > 0) {
          const latest = await col.findOne({}, { sort: { createdAt: -1 } });
          console.log(`   Latest: ${new Date(latest.createdAt).toLocaleString('en-IN')}`);
        }
        console.log('');
      }
    }

    // 3. Check for phone numbers 919075358557 and 919309986820
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📞 SEARCH SPECIFIC PHONE NUMBERS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const phones = ['919075358557', '919309986820', '919779006820'];
    
    for (const phone of phones) {
      console.log(`\n🔍 Searching for: ${phone}`);
      console.log('─────────────────────────────');
      
      let found = false;
      
      for (const colName of msgCollections) {
        if (collNames.includes(colName)) {
          const col = db.collection(colName);
          const count = await col.countDocuments({ phoneNumber: phone });
          
          if (count > 0) {
            found = true;
            const msgs = await col.find({ phoneNumber: phone }).sort({ createdAt: -1 }).limit(3).toArray();
            
            console.log(`✅ Found in ${colName}: ${count} messages`);
            msgs.forEach((m, i) => {
              const d = new Date(m.createdAt).toLocaleString('en-IN');
              const body = (m.body || m.messageContent || m.text || '(empty)').substring(0, 50);
              console.log(`   ${i+1}. [${d}] "${body}"`);
            });
          }
        }
      }
      
      if (!found) {
        console.log(`❌ NOT FOUND in any message collection`);
      }
    }

    // 4. Today's statistics
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 TODAY\'S MESSAGE STATISTICS (JAN 8, 2026)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const colName of msgCollections) {
      if (collNames.includes(colName)) {
        const col = db.collection(colName);
        const todayMsgs = await col.find({ createdAt: { $gte: today } }).sort({ createdAt: -1 }).toArray();
        
        if (todayMsgs.length > 0) {
          console.log(`✅ ${colName}: ${todayMsgs.length} messages TODAY\n`);
          
          const phoneStats = {};
          todayMsgs.forEach(m => {
            const phone = m.phoneNumber || 'unknown';
            phoneStats[phone] = (phoneStats[phone] || 0) + 1;
          });
          
          Object.entries(phoneStats).forEach(([phone, count]) => {
            console.log(`   ${phone}: ${count} messages`);
          });
          console.log('');
        }
      }
    }

    // 5. Recent messages from all collections
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📨 RECENT 20 MESSAGES (ALL COLLECTIONS)');
    console.log('═══════════════════════════════════════════════════════════\n');

    let allRecent = [];

    for (const colName of msgCollections) {
      if (collNames.includes(colName)) {
        const col = db.collection(colName);
        const msgs = await col.find({}).sort({ createdAt: -1 }).limit(10).toArray();
        msgs.forEach(m => {
          allRecent.push({
            collection: colName,
            phone: m.phoneNumber || 'unknown',
            body: (m.body || m.messageContent || m.text || '(empty)').substring(0, 40),
            date: new Date(m.createdAt).toLocaleString('en-IN'),
            direction: m.direction || m.from || 'unknown'
          });
        });
      }
    }

    allRecent.sort((a, b) => new Date(b.date) - new Date(a.date));
    allRecent.slice(0, 20).forEach((m, i) => {
      console.log(`${i+1}. ${m.phone} | ${m.direction}`);
      console.log(`   [${m.date}] "${m.body}..."`);
      console.log(`   Collection: ${m.collection}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ Check complete!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

check();
