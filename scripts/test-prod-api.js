// Test production API endpoint
const fetch = globalThis.fetch || require('node-fetch');

async function test() {
  // Login first 
  const loginRes = await fetch('https://swaryoga.com/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'mohancrm', password: 'mohan@2025' })
  });
  console.log('Login status:', loginRes.status);
  const loginText = await loginRes.text();
  console.log('Login response:', loginText.substring(0, 200));
  let loginData;
  try { loginData = JSON.parse(loginText); } catch(e) { console.log('Login parse error'); return; }
  if (!loginData.token) {
    console.log('Login failed:', JSON.stringify(loginData));
    return;
  }
  console.log('Login OK, testing dashboard API...');
  
  const res = await fetch('https://swaryoga.com/api/admin/crm/tally?action=dashboard&fy=2024-25', {
    headers: { 'Authorization': 'Bearer ' + loginData.token }
  });
  const data = await res.json();
  
  console.log('success:', data.success);
  console.log('tallyConnected:', data.tallyConnected);
  console.log('totalReceipts:', data.summary && data.summary.totalReceipts);
  console.log('receiptCount:', data.summary && data.summary.receiptCount);
  console.log('totalPayments:', data.totalPayments);
  console.log('totalContra:', data.totalContra);
  console.log('profitLoss:', data.profitLoss);
  console.log('participantCount:', data.participantCount);
  console.log('recentReceipts:', data.summary && data.summary.recentReceipts && data.summary.recentReceipts.length);
  console.log('recentPayments:', data.recentPayments && data.recentPayments.length);
  console.log('manualStats:', JSON.stringify(data.manualStats));
  
  if (data.error) {
    console.log('ERROR:', data.error);
  }
}

test().catch(e => console.error(e));
