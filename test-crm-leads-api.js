#!/usr/bin/env node

/**
 * TEST: Check if the CRM leads API is working
 */

const token = process.env.ADMIN_TOKEN || '';

if (!token) {
  console.error('❌ ADMIN_TOKEN not set in .env');
  console.log('\nTo test the API, set ADMIN_TOKEN in .env');
  console.log('Then run: node test-crm-leads-api.js');
  process.exit(1);
}

const baseUrl = 'https://crm.swaryoga.com';

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   TEST: CRM Leads API                              ║');
console.log('╚════════════════════════════════════════════════════╝\n');

async function testLeadsAPI() {
  try {
    console.log('Testing GET /api/admin/crm/leads...\n');
    
    const response = await fetch(`${baseUrl}/api/admin/crm/leads?limit=5&skip=0`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ API Response OK\n');
      console.log('Total leads:', data.data?.total);
      console.log('Leads returned:', data.data?.leads?.length || 0);
      
      if (data.data?.leads && data.data.leads.length > 0) {
        console.log('\nFirst lead:');
        const lead = data.data.leads[0];
        console.log('  ID:', lead._id);
        console.log('  Name:', lead.name);
        console.log('  Phone:', lead.phoneNumber);
        console.log('  Source:', lead.source);
        console.log('  Status:', lead.status);
      }
    } else {
      console.log('\n❌ API Error\n');
      console.log('Error:', data.error || data.message);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Request failed:', msg);
  }
}

testLeadsAPI();
