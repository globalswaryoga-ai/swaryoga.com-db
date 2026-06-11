#!/usr/bin/env node
/**
 * Diagnostic: QR WhatsApp Chat Loading Issue
 * Checks: Bridge status, Session state, DB data, Chat endpoint response
 */

require('dotenv').config({ path: '.env.local' });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const mongoose = require('mongoose');

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://5.223.65.159:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const ADMIN_USER_ID = 'admincrm';

async function checkBridgeHealth() {
  console.log('\n🔍 [1] Bridge Health Check');
  console.log(`Bridge URL: ${BRIDGE_URL}`);
  
  try {
    const response = await fetch(`${BRIDGE_URL}/status`, {
      method: 'GET',
      headers: { 'x-bridge-secret': BRIDGE_SECRET },
      timeout: 5000,
    });
    
    console.log(`  Status Code: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Bridge is running!');
      console.log(`  Connected: ${data.connected}`);
      console.log(`  Phone: ${data.phone?.id || 'Not connected'}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Response:`, JSON.stringify(data).substring(0, 300));
      return data;
    } else {
      const text = await response.text();
      console.log(`  ❌ Bridge returned ${response.status}: ${text.substring(0, 200)}`);
      return null;
    }
  } catch (error) {
    console.log(`  ❌ Bridge unreachable: ${error.message}`);
    return null;
  }
}

async function checkChatsEndpoint() {
  console.log('\n🔍 [2] Bridge /chats Endpoint');
  
  try {
    const response = await fetch(`${BRIDGE_URL}/chats`, {
      method: 'GET',
      headers: { 
        'x-bridge-secret': BRIDGE_SECRET,
        'x-user-id': ADMIN_USER_ID,
        'x-session-key': '0002456',
      },
      timeout: 5000,
    });
    
    console.log(`  Status Code: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ /chats endpoint working!');
      console.log(`  Chat Count: ${data?.length || data?.chats?.length || 0}`);
      if (Array.isArray(data)) {
        console.log(`  Chats found: ${data.length}`);
        if (data.length > 0) {
          console.log(`  First chat: ${JSON.stringify(data[0]).substring(0, 150)}`);
        }
      } else if (data?.chats) {
        console.log(`  Chats found: ${data.chats.length}`);
      }
      return data;
    } else {
      const text = await response.text();
      console.log(`  ❌ /chats returned ${response.status}: ${text.substring(0, 200)}`);
      return null;
    }
  } catch (error) {
    console.log(`  ❌ /chats failed: ${error.message}`);
    return null;
  }
}

async function checkGroupsEndpoint() {
  console.log('\n🔍 [3] Bridge /groups Endpoint');
  
  try {
    const response = await fetch(`${BRIDGE_URL}/groups`, {
      method: 'GET',
      headers: { 
        'x-bridge-secret': BRIDGE_SECRET,
        'x-user-id': ADMIN_USER_ID,
        'x-session-key': '0002456',
      },
      timeout: 5000,
    });
    
    console.log(`  Status Code: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ /groups endpoint working!');
      const groups = Array.isArray(data) ? data : (data?.groups || []);
      console.log(`  Groups found: ${groups.length}`);
      if (groups.length > 0) {
        console.log(`  First group: ${JSON.stringify(groups[0]).substring(0, 150)}`);
      }
      return data;
    } else {
      const text = await response.text();
      console.log(`  ❌ /groups returned ${response.status}: ${text.substring(0, 200)}`);
      return null;
    }
  } catch (error) {
    console.log(`  ❌ /groups failed: ${error.message}`);
    return null;
  }
}

async function checkSessionsEndpoint() {
  console.log('\n🔍 [4] Bridge /sessions Endpoint');
  
  try {
    const response = await fetch(`${BRIDGE_URL}/sessions`, {
      method: 'GET',
      headers: { 'x-bridge-secret': BRIDGE_SECRET },
      timeout: 5000,
    });
    
    console.log(`  Status Code: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ /sessions endpoint working!');
      const sessions = data?.sessions || [];
      console.log(`  Active Sessions: ${sessions.length}`);
      sessions.forEach((s, i) => {
        console.log(`    Session ${i}: key=${s.sessionKey}, status=${s.status}, phone=${s.phone?.id || 'N/A'}`);
      });
      return data;
    } else {
      const text = await response.text();
      console.log(`  ❌ /sessions returned ${response.status}: ${text.substring(0, 200)}`);
      return null;
    }
  } catch (error) {
    console.log(`  ❌ /sessions failed: ${error.message}`);
    return null;
  }
}

async function checkMongoQrChats() {
  console.log('\n🔍 [5] MongoDB QR Chats Collection');
  
  try {
    const uri = process.env.MONGODB_URI_MAIN;
    if (!uri) {
      console.log('  ❌ MONGODB_URI_MAIN not configured');
      return;
    }
    
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const crmDb = mongoose.connection.client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const qrChatsCollection = crmDb.collection('qr_whatsapp_chats');
    
    const count = await qrChatsCollection.countDocuments({ userId: ADMIN_USER_ID });
    console.log(`  Admin QR Chat Count: ${count}`);
    
    if (count > 0) {
      const sampleChats = await qrChatsCollection
        .find({ userId: ADMIN_USER_ID })
        .limit(3)
        .toArray();
      
      console.log(`  Sample chats:`);
      sampleChats.forEach((chat, i) => {
        console.log(`    ${i + 1}. ${chat.chatJid || chat.id} - ${chat.name || 'No name'} (phone: ${chat.connectedPhone})`);
      });
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.log(`  ❌ MongoDB check failed: ${error.message}`);
  }
}

async function main() {
  console.log('================================');
  console.log('QR WHATSAPP CHAT LOADING DIAGNOSTIC');
  console.log('================================');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Bridge URL: ${BRIDGE_URL}`);
  console.log(`Admin User: ${ADMIN_USER_ID}`);
  
  const bridgeStatus = await checkBridgeHealth();
  const chats = await checkChatsEndpoint();
  const groups = await checkGroupsEndpoint();
  const sessions = await checkSessionsEndpoint();
  await checkMongoQrChats();
  
  console.log('\n================================');
  console.log('DIAGNOSTIC SUMMARY');
  console.log('================================');
  
  if (!bridgeStatus) {
    console.log('🔴 CRITICAL: Bridge is not responding!');
    console.log('   Action: Start the bridge service or check network connectivity');
  } else if (!bridgeStatus.connected) {
    console.log('🟡 WARNING: Bridge is running but WhatsApp not connected');
    console.log('   Action: Scan QR code to connect WhatsApp account');
  } else {
    console.log('🟢 Bridge is connected to WhatsApp');
    
    if (!chats || (Array.isArray(chats) ? chats.length === 0 : !chats?.chats?.length)) {
      console.log('🟡 WARNING: Bridge has no chats returned');
      console.log('   Possible causes:');
      console.log('   - No conversations in WhatsApp account');
      console.log('   - Bridge /chats endpoint issue');
      console.log('   - Session isolation problem');
    } else {
      console.log(`🟢 Bridge is returning chats: ${Array.isArray(chats) ? chats.length : chats?.chats?.length} found`);
    }
  }
  
  console.log('\n================================\n');
}

main().catch(console.error);
