/*
  PayU payment page open-check

  What it does:
  - (Optionally) creates a test user via /api/auth/signup
  - logs in via /api/auth/login
  - calls /api/payments/payu/initiate
  - writes an auto-submitting HTML form you can open in a browser to confirm PayU UI opens

  Safe note:
  - Running this against production will create a PENDING Order.
  - No money is charged unless you complete payment on PayU.
*/

require('dotenv').config();

const fs = require('fs');
const path = require('path');

function usage() {
  console.log(`\nUsage:\n  node scripts/payu-open-check.js --baseUrl=https://swaryoga.com --email=test+payu@swaryoga.com --password='YourPass123!' --createUser=1\n\nOptions:\n  --baseUrl     Base URL (default: http://localhost:3000)\n  --email       User email\n  --password    User password\n  --createUser  1 to create user if missing (default: 0)\n  --country     india|international (default: india)\n  --amount      Amount BEFORE 3.3% fee (default: 1)\n  --city        City (default: Mumbai)\n`);
}

function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const [k, ...rest] = raw.slice(2).split('=');
    out[k] = rest.join('=');
  }
  return out;
}

async function requestJson(url, options) {
  const res = await fetch(url, {
    redirect: 'follow',
    ...options,
    headers: {
      ...(options && options.headers ? options.headers : {}),
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
    const err = new Error(`${msg} (${res.status})`);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json;
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFilePart(value) {
  return String(value)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const baseUrl = (args.baseUrl || 'http://localhost:3000').replace(/\/$/, '');
  const email = args.email;
  const password = args.password;
  const createUser = String(args.createUser || '0') === '1';
  const country = (args.country || 'india').toLowerCase();
  const amount = Number(args.amount || 1);
  const city = args.city || 'Mumbai';

  if (!email || !password) {
    usage();
    throw new Error('Missing --email or --password');
  }
  if (!['india', 'international'].includes(country)) {
    throw new Error('Invalid --country. Use india or international');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid --amount. Must be > 0');
  }

  // 1) Create user (optional)
  if (createUser) {
    try {
      console.log('Creating user (if not exists)...');
      await requestJson(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'PayU Test User',
          email,
          phone: '9999999999',
          countryCode: '+91',
          country: 'India',
          state: 'Maharashtra',
          gender: 'Other',
          age: 28,
          profession: 'Testing',
          password,
        }),
      });
      console.log('✅ User created');
    } catch (err) {
      // If already exists (409), continue.
      if (err && err.status === 409) {
        console.log('ℹ️  User already exists, continuing...');
      } else {
        console.log('⚠️  Could not create user, continuing to login...');
      }
    }
  }

  // 2) Login
  console.log('Logging in...');
  const login = await requestJson(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const token = login && login.token;
  if (!token) throw new Error('Login did not return a token');
  console.log('✅ Login OK');

  // 3) Initiate payment
  console.log('Initiating PayU payment...');
  const initiated = await requestJson(`${baseUrl}/api/payments/payu/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount,
      productInfo: 'PayU open-check (no charge unless completed)',
      firstName: 'PayU',
      lastName: 'Test',
      email,
      phone: '9999999999',
      city,
      country,
      currency: country === 'india' ? 'INR' : 'USD',
      items: [],
    }),
  });

  const paymentUrl = initiated.paymentUrl;
  const params = initiated.params;

  if (!paymentUrl || !params) {
    throw new Error('Initiate did not return paymentUrl/params');
  }

  console.log('\n✅ Initiated');
  console.log('orderId:', initiated.orderId);
  console.log('paymentUrl:', paymentUrl);
  console.log('txnid:', params.txnid);

  // 4) Write HTML auto-submit form
  const fileName = `payu-open-check.${safeFilePart(baseUrl)}.${safeFilePart(email)}.html`;
  const outPath = path.resolve(process.cwd(), fileName);

  const inputs = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${htmlEscape(k)}" value="${htmlEscape(v)}" />`)
    .join('\n');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PayU Open Check</title>
  </head>
  <body>
    <h2>PayU open-check</h2>
    <p>
      This will submit a payment request to PayU and should open the PayU payment UI.
      You can cancel on PayU to avoid completing payment.
    </p>

    <form id="payuForm" method="POST" action="${htmlEscape(paymentUrl)}">
      ${inputs}
      <button type="submit">Open PayU Payment Page</button>
    </form>

    <script>
      // Auto-submit after a short delay.
      setTimeout(() => {
        document.getElementById('payuForm').submit();
      }, 500);
    </script>
  </body>
</html>`;

  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`\n✅ Wrote HTML form: ${outPath}`);
  console.log('Open this file in your browser to confirm the PayU payment page opens.');
}

main().catch((err) => {
  console.error('\n❌ PayU open-check failed');
  console.error(err && err.message ? err.message : err);
  if (err && err.body) {
    console.error('Response body:', JSON.stringify(err.body, null, 2));
  }
  process.exitCode = 1;
});
