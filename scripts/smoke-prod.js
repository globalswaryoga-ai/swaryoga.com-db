#!/usr/bin/env node
/**
 * Simple production smoke test for SwarYoga.
 *
 * What it does:
 * 1) GET /api/health
 * 2) Optionally POST /api/admin/auth/login (if ADMIN_USER_ID + ADMIN_PASSWORD are set)
 * 3) Optionally GET /api/admin/crm/leads?limit=1 using the returned token
 *
 * Usage examples:
 *   BASE_URL='https://your-prod-domain.com' node scripts/smoke-prod.js
 *   BASE_URL='http://localhost:3000' ADMIN_USER_ID='admincrm' ADMIN_PASSWORD='admin12345' node scripts/smoke-prod.js
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function redact(value) {
  if (!value) return value;
  const s = String(value);
  if (s.length <= 6) return '***';
  return `${s.slice(0, 3)}***${s.slice(-3)}`;
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _nonJsonBody: text };
  }
  return { res, json, text };
}

async function main() {
  const started = Date.now();
  console.log(`\n🔎 Smoke test: ${BASE_URL}`);

  // 1) Health
  {
    const { res, json } = await fetchJson(`${BASE_URL}/api/health`);
    if (!res.ok) {
      console.error(`❌ /api/health failed: ${res.status} ${res.statusText}`);
      console.error(json);
      process.exitCode = 1;
      return;
    }
    console.log(`✅ /api/health: ${res.status}`);
  }

  // If no creds, we're done.
  if (!ADMIN_USER_ID || !ADMIN_PASSWORD) {
    console.log(`ℹ️  Skipping admin login (set ADMIN_USER_ID + ADMIN_PASSWORD to test protected routes).`);
    console.log(`⏱️  Done in ${Date.now() - started}ms\n`);
    return;
  }

  console.log(`\n🔐 Testing admin login as ${ADMIN_USER_ID} (password ${redact(ADMIN_PASSWORD)})`);

  // 2) Admin login
  let token;
  {
    const { res, json } = await fetchJson(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: ADMIN_USER_ID, password: ADMIN_PASSWORD }),
    });

    if (!res.ok) {
      console.error(`❌ Admin login failed: ${res.status} ${res.statusText}`);
      console.error(json);
      process.exitCode = 1;
      return;
    }

    token = json?.token;
    if (!token) {
      console.error(`❌ Admin login response missing token`);
      console.error(json);
      process.exitCode = 1;
      return;
    }

    console.log(`✅ Admin login ok: ${res.status}`);
  }

  // 3) Protected route
  {
    const { res, json } = await fetchJson(`${BASE_URL}/api/admin/crm/leads?limit=1`, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error(`❌ Protected leads call failed: ${res.status} ${res.statusText}`);
      console.error(json);
      process.exitCode = 1;
      return;
    }

    const total = json?.data?.total;
    const count = Array.isArray(json?.data?.leads) ? json.data.leads.length : undefined;
    console.log(`✅ /api/admin/crm/leads ok: ${res.status} (returned ${count ?? 'n/a'} leads, total ${total ?? 'n/a'})`);
  }

  console.log(`\n⏱️  Done in ${Date.now() - started}ms\n`);
}

main().catch((err) => {
  console.error('❌ Smoke test crashed');
  console.error(err);
  process.exitCode = 1;
});
