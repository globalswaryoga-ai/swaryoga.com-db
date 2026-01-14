
const fetch = require('node-fetch');

async function testRoute(name, url, method = 'GET', body = null) {
  console.log(`\n--- Testing ${name} ---`);
  console.log(`URL: ${url}`);
  try {
    const options = { method };
    if (body) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log(`Response (JSON):`, json);
    } catch {
      console.log(`Response (Text): ${text.substring(0, 100)}...`);
    }
    return res.status;
  } catch (err) {
    console.log(`Error: ${err.message}`);
    return 500;
  }
}

async function run() {
  const baseUrl = 'http://localhost:3000';
  
  // 1. Check if qr-bridge proxy exists
  await testRoute('QR Bridge Proxy', `${baseUrl}/api/admin/crm/whatsapp/qr-bridge?path=/status`);
  
  // 2. Check if messages endpoint (for mark-read) exists
  await testRoute('Messages API', `${baseUrl}/api/admin/crm/messages`, 'POST', { action: 'markThreadAsRead', phoneNumber: '918806086523' });

  // 3. Check if lead by phone exists
  await testRoute('Lead By Phone', `${baseUrl}/api/admin/crm/leads/by-phone/918806086523`);

  console.log('\nTest complete.');
}

run();
