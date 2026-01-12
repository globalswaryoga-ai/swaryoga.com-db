/*
  WhatsApp Bridge Watchdog

  Purpose:
  - Periodically checks the WhatsApp Web bridge health endpoint.
  - If the bridge is unhealthy or flapping, it triggers a restart via /restart.

  Notes:
  - This watchdog is safe to run alongside PM2/systemd.
  - It won't restart too frequently (cooldown).

  Env vars:
  - WHATSAPP_BRIDGE_HTTP_URL   (default: http://localhost:3333)
  - WHATSAPP_BRIDGE_SECRET     (default: swar-bridge-secret-2024)
  - WATCHDOG_INTERVAL_MS       (default: 15000)
  - WATCHDOG_RESTART_COOLDOWN_MS (default: 120000)
  - WATCHDOG_MAX_CONSECUTIVE_FAILS (default: 3)
*/

const BRIDGE_URL = (process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333').replace(/\/$/, '');
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

const INTERVAL_MS = Number(process.env.WATCHDOG_INTERVAL_MS || 15000);
const RESTART_COOLDOWN_MS = Number(process.env.WATCHDOG_RESTART_COOLDOWN_MS || 120000);
const MAX_FAILS = Number(process.env.WATCHDOG_MAX_CONSECUTIVE_FAILS || 3);

let consecutiveFails = 0;
let lastRestartAt = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function bridgeFetch(path, options = {}) {
  const url = `${BRIDGE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'x-bridge-secret': BRIDGE_SECRET,
    },
  });
  return res;
}

async function checkOnce() {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`);
    if (!res.ok) throw new Error(`health http ${res.status}`);
    const data = await res.json();

    const ok = Boolean(data && data.ok);
    const status = data?.status;

    // Treat these as healthy-ish (qr and connecting mean it needs user scan, not crash)
    const healthyStatuses = new Set(['connected', 'authenticated', 'qr', 'connecting']);
    const healthy = ok && healthyStatuses.has(status);

    if (healthy) {
      consecutiveFails = 0;
      return { healthy: true, status, reason: null };
    }

    consecutiveFails += 1;
    return {
      healthy: false,
      status,
      reason: data?.lastDisconnectReason || data?.lastAuthFailure || 'unhealthy_status',
    };
  } catch (err) {
    consecutiveFails += 1;
    return { healthy: false, status: 'unreachable', reason: err?.message || String(err) };
  }
}

async function maybeRestart(reason) {
  const now = Date.now();
  if (now - lastRestartAt < RESTART_COOLDOWN_MS) return false;

  try {
    const res = await bridgeFetch('/restart', { method: 'POST' });
    if (!res.ok) throw new Error(`restart http ${res.status}`);
    lastRestartAt = now;
    consecutiveFails = 0;
    console.log(`[watchdog] restart triggered. reason=${reason}`);
    return true;
  } catch (err) {
    console.error('[watchdog] restart failed:', err?.message || err);
    return false;
  }
}

async function main() {
  console.log('[watchdog] starting');
  console.log('[watchdog] bridge:', BRIDGE_URL);
  console.log('[watchdog] interval(ms):', INTERVAL_MS);
  console.log('[watchdog] restartCooldown(ms):', RESTART_COOLDOWN_MS);
  console.log('[watchdog] maxFails:', MAX_FAILS);

  // tiny initial delay so bridge can boot
  await sleep(1500);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const r = await checkOnce();
    if (!r.healthy) {
      console.warn(`[watchdog] unhealthy. status=${r.status} fails=${consecutiveFails}/${MAX_FAILS} reason=${r.reason}`);
    } else {
      // keep logs lighter
      // console.log(`[watchdog] ok. status=${r.status}`);
    }

    if (!r.healthy && consecutiveFails >= MAX_FAILS) {
      await maybeRestart(r.reason);
    }

    await sleep(INTERVAL_MS);
  }
}

main().catch((e) => {
  console.error('[watchdog] fatal:', e);
  process.exit(1);
});
