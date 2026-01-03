#!/usr/bin/env node

/**
 * Test WhatsApp send endpoint
 * Usage: node test-whatsapp-send.js <jwt-token>
 */

const http = require('http');
const https = require('https');

const token = process.argv[2];
if (!token) {
  console.error('❌ JWT token required');
  console.error('Usage: JWT_TOKEN=<your-token> node test-whatsapp-send.js');
  process.exit(1);
}

console.log('📊 WhatsApp Send Endpoint Test\n');

// Create a test lead first
async function createTestLead() {
  console.log('1️⃣  Creating test lead...');
  try {
    const res = await fetch('http://localhost:3000/api/admin/crm/leads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: '+91 9876543210',
        name: 'Test User',
        source: 'test',
      }),
    });

    const data = await res.json();
    if (!data?.data?._id) {
      console.error('❌ Failed to create lead:', data);
      return null;
    }
    console.log('✅ Lead created:', data.data._id);
    return data.data._id;
  } catch (err) {
    console.error('❌ Lead creation error:', err.message);
    return null;
  }
}

// Test send endpoint
async function testSend(leadId) {
  console.log('\n2️⃣  Testing send endpoint...');
  console.log('   Endpoint: POST /api/admin/crm/whatsapp/send');
  console.log('   Lead ID:', leadId);
  
  try {
    const res = await fetch('http://localhost:3000/api/admin/crm/whatsapp/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId,
        phoneNumber: '919876543210',
        messageContent: 'Test message from node',
      }),
    });

    console.log(`   Status: ${res.status} ${res.statusText}`);
    
    const data = await res.json();
    console.log('   Response:', JSON.stringify(data, null, 2));

    if (res.ok || res.status === 202) {
      console.log('\n✅ SUCCESS! Message was:', data?.data?.status || 'unknown');
    } else {
      console.log('\n❌ FAILED:', data?.error || 'Unknown error');
    }
  } catch (err) {
    console.error('❌ Send error:', err.message);
  }
}

async function main() {
  const leadId = await createTestLead();
  if (!leadId) {
    console.error('Cannot continue without lead');
    process.exit(1);
  }
  
  await testSend(leadId);
}

main().catch(console.error);
