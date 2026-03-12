#!/usr/bin/env node
/**
 * Anti-Bug smoke test for CRM production/local environments.
 *
 * Checks:
 * 1) /api/health?deep=true
 * 2) optional admin login
 * 3) /api/admin/crm/anti-bug
 *
 * Usage:
 *   BASE_URL='https://crm.swaryoga.com' node scripts/anti-bug-smoke.js
 *   BASE_URL='http://localhost:3000' ADMIN_USER_ID='admincrm' ADMIN_PASSWORD='secret' node scripts/anti-bug-smoke.js
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }

  return { response, json };
}

async function main() {
  console.log(`\n🛡️  Anti-Bug smoke for ${BASE_URL}`);

  const health = await fetchJson(`${BASE_URL}/api/health?deep=true`);
  if (!health.response.ok) {
    console.error(`❌ Health check failed: ${health.response.status}`);
    console.error(health.json);
    process.exit(1);
  }

  console.log(`✅ Health endpoint OK (${health.response.status}) · status=${health.json?.status || 'unknown'}`);

  if (!ADMIN_USER_ID || !ADMIN_PASSWORD) {
    console.log('ℹ️  Skipping Anti-Bug API auth test (set ADMIN_USER_ID and ADMIN_PASSWORD to continue).');
    return;
  }

  const login = await fetchJson(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: ADMIN_USER_ID, password: ADMIN_PASSWORD }),
  });

  if (!login.response.ok || !login.json?.token) {
    console.error(`❌ Admin login failed: ${login.response.status}`);
    console.error(login.json);
    process.exit(1);
  }

  console.log('✅ Admin login OK');

  const antiBug = await fetchJson(`${BASE_URL}/api/admin/crm/anti-bug`, {
    headers: {
      Authorization: `Bearer ${login.json.token}`,
    },
  });

  if (!antiBug.response.ok || !antiBug.json?.success) {
    console.error(`❌ Anti-Bug API failed: ${antiBug.response.status}`);
    console.error(antiBug.json);
    process.exit(1);
  }

  const report = antiBug.json.data || {};
  console.log(`✅ Anti-Bug API OK · status=${report.status || 'unknown'}`);
  console.log(`   Mongo: ${report.checks?.mongodb?.ok ? 'ok' : 'fail'} · Bridge: ${report.checks?.bridge?.ok ? 'ok' : 'fail'} · QR errors: ${report.errorStats?.qrRecentCount ?? 'n/a'}`);
}

main().catch((error) => {
  console.error('❌ Anti-Bug smoke crashed');
  console.error(error);
  process.exit(1);
});