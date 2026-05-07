const mongoose = require('mongoose');
const https = require('https');

async function checkConnections() {
  console.log('🔍 Checking Database & CDN Connections\n');
  console.log('═'.repeat(60));

  // 1. MongoDB Connection Test
  console.log('\n1️⃣  MONGODB CONNECTION TEST');
  console.log('─'.repeat(60));
  try {
    await mongoose.connect('mongodb://localhost:27017/swaryogaDB');
    
    const db = mongoose.connection.db;
    const adminDb = db.admin();
    
    // Get server status
    const status = await adminDb.serverStatus();
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`   Host: localhost:27017`);
    console.log(`   Database: swaryogaDB`);
    console.log(`   Uptime: ${status.uptime} seconds`);
    console.log(`   Version: ${status.version}`);
    console.log(`   Current Connections: ${status.connections.current}`);
    console.log(`   Available Connections: ${status.connections.available}`);
    
    // Count collections
    const collections = await db.listCollections().toArray();
    console.log(`   Collections: ${collections.length}`);
    
    // Check users collection
    const usersColl = db.collection('users');
    const userCount = await usersColl.countDocuments();
    console.log(`   Users in database: ${userCount}`);
    
    await mongoose.disconnect();
  } catch (err) {
    console.log('❌ MongoDB Connection Failed');
    console.log(`   Error: ${err.message}`);
  }

  // 2. Bunny CDN Connection Test
  console.log('\n2️⃣  BUNNY CDN CONNECTION TEST');
  console.log('─'.repeat(60));
  
  const BUNNY_ENDPOINT = process.env.BUNNY_STORAGE_ENDPOINT || 'https://storage.bunnycdn.com';
  const BUNNY_ZONE = process.env.BUNNY_STORAGE_ZONE || 'swaryogacommunity';
  const BUNNY_KEY = process.env.BUNNY_STORAGE_KEY;
  
  console.log(`   Endpoint: ${BUNNY_ENDPOINT}`);
  console.log(`   Zone: ${BUNNY_ZONE}`);
  console.log(`   API Key: ${BUNNY_KEY ? '✓ Set' : '✗ Not set'}`);
  
  if (!BUNNY_KEY) {
    console.log('\n⚠️  WARNING: BUNNY_STORAGE_KEY not found in environment');
    console.log('   Bunny CDN cannot be tested without API key');
  } else {
    // Test Bunny connection
    return new Promise((resolve) => {
      const options = {
        hostname: 'storage.bunnycdn.com',
        path: `/swaryogacommunity/`,
        method: 'GET',
        headers: {
          'AccessKey': BUNNY_KEY,
        }
      };

      https.request(options, (res) => {
        if (res.statusCode === 200 || res.statusCode === 400) {
          console.log(`✅ Bunny CDN Connected Successfully`);
          console.log(`   Status Code: ${res.statusCode}`);
          console.log(`   Response: Zone accessible`);
        } else {
          console.log(`⚠️  Bunny CDN Response: ${res.statusCode}`);
        }
        resolve();
      }).on('error', (err) => {
        console.log(`❌ Bunny CDN Connection Failed`);
        console.log(`   Error: ${err.message}`);
        resolve();
      }).end();
    });
  }
}

checkConnections().then(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Connection Check Complete');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
