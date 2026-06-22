#!/usr/bin/env node

/*
 * QR Bridge Watchdog
 *
 * Runs on the bridge VPS beside the PM2 `wa-bridge` process.
 * Restarts the bridge when Baileys gets stuck in `connecting` but never emits
 * a QR code. This keeps QR scanner recovery automatic without restarting while
 * a valid QR is waiting to be scanned.
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch {
  // dotenv is available in the bridge app; continue with process env if not.
}

const BRIDGE_HOST = process.env.QR_WATCHDOG_HOST || '127.0.0.1';
const BRIDGE_PORT = Number(process.env.PORT || process.env.QR_WATCHDOG_PORT || 3333);
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || process.env.BRIDGE_SECRET || '';
const SESSION_KEY = process.env.QR_WATCHDOG_SESSION_KEY || '';
const USER_ID = process.env.QR_WATCHDOG_USER_ID || SESSION_KEY || '';
const TENANT_ID = process.env.QR_WATCHDOG_TENANT_ID || SESSION_KEY || '';
const CHECK_INTERVAL_MS = Number(process.env.QR_WATCHDOG_INTERVAL_MS || 30000);
const STUCK_THRESHOLD = Number(process.env.QR_WATCHDOG_STUCK_THRESHOLD || 4);
const RESTART_COOLDOWN_MS = Number(process.env.QR_WATCHDOG_RESTART_COOLDOWN_MS || 180000);
const MAX_RESTART_COOLDOWN_MS = Number(process.env.QR_WATCHDOG_MAX_RESTART_COOLDOWN_MS || 1800000);
const HTTP_TIMEOUT_MS = Number(process.env.QR_WATCHDOG_HTTP_TIMEOUT_MS || 8000);
const LOG_FILE = process.env.QR_WATCHDOG_LOG_FILE || '/tmp/qr-bridge-watchdog.log';
const REPORT_INTERVAL_MS = Number(process.env.QR_WATCHDOG_REPORT_INTERVAL_MS || 24 * 60 * 60 * 1000);

let stuckCount = 0;
let failureCount = 0;
let lastRestartAt = 0;
let restartCount = 0;
let currentRestartCooldownMs = RESTART_COOLDOWN_MS;
let lastReportAt = 0;
let restarting = false;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, `${line}\n`);
  } catch {
    // Ignore logging errors.
  }
}

function bridgeRequest(pathname, sessionScoped = false) {
  return new Promise((resolve) => {
    const headers = {
      'x-bridge-secret': BRIDGE_SECRET,
    };
    if (sessionScoped && SESSION_KEY) {
      headers['x-session-key'] = SESSION_KEY;
      headers['x-tenant-id'] = TENANT_ID;
      headers['x-user-id'] = USER_ID;
    }

    const req = http.request(
      {
        hostname: BRIDGE_HOST,
        port: BRIDGE_PORT,
        path: pathname,
        method: 'GET',
        timeout: HTTP_TIMEOUT_MS,
        headers,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1024 * 1024) req.destroy(new Error('response_too_large'));
        });
        res.on('end', () => {
          let data = null;
          try {
            data = body ? JSON.parse(body) : null;
          } catch {
            // Some bridge versions return text/html for /qr. Keep raw body.
          }
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, statusCode: res.statusCode, data, body });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (error) => {
      resolve({ ok: false, error: error.message });
    });
    req.end();
  });
}

function hasQrPayload(qrResponse) {
  const data = qrResponse && qrResponse.data;
  if (data && typeof data.qr === 'string' && data.qr.length > 20) return true;
  const body = String((qrResponse && qrResponse.body) || '');
  return /data:image\/png;base64,/.test(body) || /Scan this QR/i.test(body);
}

async function restartBridge(reason) {
  if (restarting) return;
  const now = Date.now();
  if (now - lastRestartAt < currentRestartCooldownMs) {
    log(`Restart suppressed by cooldown. reason=${reason} remainingMs=${currentRestartCooldownMs - (now - lastRestartAt)}`);
    return;
  }

  restarting = true;
  lastRestartAt = now;
  restartCount += 1;
  log(`Restarting wa-bridge. reason=${reason} restartCount=${restartCount} cooldownMs=${currentRestartCooldownMs}`);

  await new Promise((resolve) => {
    const child = spawn('pm2', ['restart', 'wa-bridge', '--update-env'], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk) => log(`[pm2] ${String(chunk).trim()}`));
    child.stderr.on('data', (chunk) => log(`[pm2-error] ${String(chunk).trim()}`));
    child.on('close', (code) => {
      log(`pm2 restart exited code=${code}`);
      resolve();
    });
  });

  stuckCount = 0;
  failureCount = 0;
  currentRestartCooldownMs = Math.min(currentRestartCooldownMs * 2, MAX_RESTART_COOLDOWN_MS);
  restarting = false;
}

async function checkOnce() {
  const healthRes = await bridgeRequest('/health');
  if (!healthRes.ok) {
    failureCount += 1;
    log(`Health check failed ${failureCount}/${STUCK_THRESHOLD}: ${healthRes.error || healthRes.statusCode}`);
    if (failureCount >= STUCK_THRESHOLD) await restartBridge('health_unreachable');
    return;
  }

  if (!SESSION_KEY) {
    failureCount = 0;
    stuckCount = 0;
    maybeReport({ mode: 'health_only', activeSessions: healthRes.data?.activeSessions });
    return;
  }

  const statusRes = await bridgeRequest('/status', true);

  if (!statusRes.ok) {
    failureCount += 1;
    log(`Status check failed ${failureCount}/${STUCK_THRESHOLD}: ${statusRes.error || statusRes.statusCode}`);
    if (failureCount >= STUCK_THRESHOLD) await restartBridge('status_unreachable');
    return;
  }

  failureCount = 0;
  const status = statusRes.data || {};
  const connected = Boolean(status.connected);
  const state = String(status.status || 'unknown');
  const qrAvailable = Boolean(status.qrAvailable);

  if (connected || qrAvailable || state !== 'connecting') {
    if (stuckCount > 0) log(`Recovered without restart. state=${state} connected=${connected} qrAvailable=${qrAvailable}`);
    stuckCount = 0;
    if (connected) currentRestartCooldownMs = RESTART_COOLDOWN_MS;
    maybeReport({ mode: 'session', activeSessions: healthRes.data?.activeSessions, connected, state, qrAvailable });
    return;
  }

  const qrRes = await bridgeRequest('/qr', true);
  if (hasQrPayload(qrRes)) {
    if (stuckCount > 0) log('QR payload is available; not restarting.');
    stuckCount = 0;
    maybeReport({ mode: 'session', activeSessions: healthRes.data?.activeSessions, connected, state, qrAvailable: true });
    return;
  }

  stuckCount += 1;
  log(`No QR while connecting ${stuckCount}/${STUCK_THRESHOLD}. retryCount=${status.retryCount ?? 'n/a'}`);

  if (stuckCount >= STUCK_THRESHOLD) {
    await restartBridge('connecting_without_qr');
  }
}

function maybeReport(details) {
  const now = Date.now();
  if (now - lastReportAt < REPORT_INTERVAL_MS) return;
  lastReportAt = now;
  log(`Daily health summary ${JSON.stringify({ ...details, restarts: restartCount, cooldownMs: currentRestartCooldownMs })}`);
}

async function main() {
  log(`QR bridge watchdog started host=${BRIDGE_HOST} port=${BRIDGE_PORT} intervalMs=${CHECK_INTERVAL_MS} threshold=${STUCK_THRESHOLD} sessionScoped=${Boolean(SESSION_KEY)}`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await checkOnce();
    } catch (error) {
      failureCount += 1;
      log(`Watchdog error ${failureCount}/${STUCK_THRESHOLD}: ${error.message || error}`);
      if (failureCount >= STUCK_THRESHOLD) await restartBridge('watchdog_error');
    }
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
  }
}

main().catch((error) => {
  log(`Fatal watchdog error: ${error.message || error}`);
  process.exit(1);
});
