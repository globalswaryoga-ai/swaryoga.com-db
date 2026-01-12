/*
  WhatsApp Bridge Smoke Test
  - Verifies the bridge server responds and QR endpoints behave

  Usage:
    node scripts/whatsapp-bridge-smoke.js

  Optional env:
    BRIDGE_BASE_URL=http://localhost:3333
*/

const base = process.env.BRIDGE_BASE_URL || 'http://localhost:3333';

async function mustFetch(path, init) {
  const url = base + path;
  const res = await fetch(url, { cache: 'no-store', ...init });
  return { url, res };
}

function ok(msg) {
  console.log(`PASS  ${msg}`);
}

function fail(msg) {
  console.error(`FAIL  ${msg}`);
  process.exitCode = 1;
}

(async () => {
  // /status
  try {
    const { url, res } = await mustFetch('/status');
    if (!res.ok) {
      fail(`${url} -> ${res.status}`);
    } else {
      const json = await res.json();
      if (!json || typeof json.status !== 'string') {
        fail(`${url} -> JSON missing status`);
      } else {
        ok(`${url} -> ${json.status} (hasQr=${!!json.hasQr})`);
      }
    }
  } catch (e) {
    fail(`/status fetch error: ${e.message}`);
  }

  // /qr-view should always be HTML
  try {
    const { url, res } = await mustFetch('/qr-view');
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) fail(`${url} -> ${res.status}`);
    else if (!ct.includes('text/html')) fail(`${url} -> unexpected content-type: ${ct}`);
    else ok(`${url} -> ${res.status} ${ct}`);
  } catch (e) {
    fail(`/qr-view fetch error: ${e.message}`);
  }

  // /wa-qr.png should always be an image response (png when QR exists; svg placeholder otherwise)
  try {
    const { url, res } = await mustFetch('/wa-qr.png');
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) fail(`${url} -> ${res.status}`);
    else if (!ct.startsWith('image/')) fail(`${url} -> expected image/* content-type, got ${ct}`);
    else ok(`${url} -> ${res.status} ${ct}`);
  } catch (e) {
    fail(`/wa-qr.png fetch error: ${e.message}`);
  }

  // /qr?format=png: may be image/png or JSON (if no QR); both are acceptable.
  try {
    const { url, res } = await mustFetch('/qr?format=png');
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) {
      fail(`${url} -> ${res.status}`);
    } else if (!(ct.includes('image/png') || ct.includes('application/json'))) {
      fail(`${url} -> unexpected content-type ${ct}`);
    } else {
      ok(`${url} -> ${res.status} ${ct}`);
    }
  } catch (e) {
    fail(`/qr?format=png fetch error: ${e.message}`);
  }

  if (process.exitCode) {
    console.error(`\nSmoke test FAILED for base ${base}`);
    process.exit(process.exitCode);
  }

  console.log(`\nSmoke test OK for base ${base}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
