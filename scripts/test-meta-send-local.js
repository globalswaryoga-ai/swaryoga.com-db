// End-to-end local test:
// 1) Login as admin via HTTP
// 2) Call Meta send endpoint with returned JWT
//
// Usage:
//   node scripts/test-meta-send-local.js
//
// Optional env:
//   BASE_URL=http://localhost:3002
//   ADMIN_USERID=admincrm
//   ADMIN_PASSWORD=admin
//   TO_PHONE=919xxxxxxxxx
//   MESSAGE='ping'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const ADMIN_USERID = process.env.ADMIN_USERID || 'admincrm';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const TO_PHONE = process.env.TO_PHONE || '919309986820';
const MESSAGE = process.env.MESSAGE || 'ping';

async function main() {
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: ADMIN_USERID, password: ADMIN_PASSWORD }),
  });
  const loginText = await loginRes.text();
  let loginJson;
  try {
    loginJson = JSON.parse(loginText);
  } catch {
    throw new Error(`Login returned non-JSON (${loginRes.status}): ${loginText}`);
  }

  if (!loginRes.ok || !loginJson?.token) {
    throw new Error(`Login failed (${loginRes.status}): ${loginText}`);
  }

  const token = loginJson.token;

  const sendRes = await fetch(`${BASE_URL}/api/admin/crm/whatsapp/meta/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phoneNumber: TO_PHONE, messageContent: MESSAGE }),
  });

  const sendBody = await sendRes.text();
  console.log('LOGIN_STATUS', loginRes.status);
  console.log('SEND_STATUS', sendRes.status);
  console.log(sendBody);
}

main().catch((e) => {
  console.error('TEST_FAILED', e?.message || e);
  process.exit(1);
});
