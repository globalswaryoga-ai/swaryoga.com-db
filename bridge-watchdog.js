#!/usr/bin/env node

/**
 * Bridge Watchdog: Monitors the WhatsApp bridge health and auto-restarts if unhealthy.
 * 
 * Problem: The bridge gets into a state where it reports "connected" but is actually
 * broken (returning 503 errors, markedUnread crashes, etc.). This script detects that
 * and forces a restart.
 * 
 * Run: node bridge-watchdog.js
 * Or in background: nohup node bridge-watchdog.js > /tmp/bridge-watchdog.log 2>&1 &
 * Or with PM2: pm2 start bridge-watchdog.js --name wa-bridge-watchdog --watch
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const BRIDGE_HOST = process.env.BRIDGE_HOST || 'localhost';
const BRIDGE_PORT = process.env.BRIDGE_PORT || 3333;
const BRIDGE_SECRET = process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const CHECK_INTERVAL = parseInt(process.env.WATCHDOG_INTERVAL || '30') * 1000; // 30 seconds
const FAILURE_THRESHOLD = parseInt(process.env.FAILURE_THRESHOLD || '3'); // Restart after 3 consecutive failures
const TIMEOUT_MS = 5000; // 5 second timeout for health check

let consecutiveFailures = 0;
let lastCheckTime = null;
let lastStatus = null;

const log = (msg) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
  // Also write to file for debugging
  try {
    fs.appendFileSync('/tmp/bridge-watchdog.log', `[${timestamp}] ${msg}\n`);
  } catch (e) {
    // Ignore write errors
  }
};

/**
 * Check bridge health via HTTP status endpoint
 */
async function checkBridgeHealth() {
  return new Promise((resolve) => {
    const options = {
      hostname: BRIDGE_HOST,
      port: BRIDGE_PORT,
      path: '/status',
      method: 'GET',
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
      },
      timeout: TIMEOUT_MS,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          resolve({ ok: true, status });
        } catch (e) {
          resolve({ ok: false, error: 'Invalid JSON response', data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Request timeout' });
    });

    req.end();
  });
}

/**
 * Check if bridge endpoint is responding with errors
 */
async function checkBridgeEndpoints() {
  return new Promise((resolve) => {
    const options = {
      hostname: BRIDGE_HOST,
      port: BRIDGE_PORT,
      path: '/chats',
      method: 'GET',
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
      },
      timeout: TIMEOUT_MS,
    };

    const req = http.request(options, (res) => {
      // Any 2xx or 3xx is OK, 4xx is auth issue (still working), 5xx is bad
      const isHealthy = res.statusCode < 500;
      resolve({ ok: isHealthy, statusCode: res.statusCode });
    });

    req.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Request timeout' });
    });

    req.end();
  });
}

/**
 * Restart the bridge service
 */
async function restartBridge() {
  return new Promise((resolve) => {
    log('⚠️  Restarting bridge due to health check failure...');
    
    const restart = spawn('pm2', ['restart', 'wa-bridge'], {
      stdio: 'pipe',
      detached: false,
    });

    restart.stdout.on('data', (data) => {
      log(`[pm2] ${data.toString().trim()}`);
    });

    restart.stderr.on('data', (data) => {
      log(`[pm2 ERROR] ${data.toString().trim()}`);
    });

    restart.on('close', (code) => {
      if (code === 0) {
        log('✅ Bridge restarted successfully');
        consecutiveFailures = 0;
        resolve(true);
      } else {
        log(`❌ Bridge restart failed with code ${code}`);
        resolve(false);
      }
    });
  });
}

/**
 * Main watchdog loop
 */
async function watchdogLoop() {
  try {
    lastCheckTime = new Date();
    log('🔍 Checking bridge health...');

    // Check status endpoint
    const statusCheck = await checkBridgeHealth();
    if (!statusCheck.ok) {
      log(`❌ Status check failed: ${statusCheck.error}`);
      consecutiveFailures++;
    } else {
      lastStatus = statusCheck.status;
      // Also check if bridge is actually functional (not just reporting status)
      const endpointCheck = await checkBridgeEndpoints();
      if (!endpointCheck.ok) {
        log(`❌ Bridge endpoints failing (status ${endpointCheck.statusCode}): ${endpointCheck.error}`);
        consecutiveFailures++;
      } else {
        log(`✅ Bridge healthy - status: ${statusCheck.status.status}, sessionReady: ${statusCheck.status.sessionReady}`);
        consecutiveFailures = 0;
        return;
      }
    }

    // If consecutive failures exceed threshold, restart
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      log(`🚨 Bridge unhealthy for ${consecutiveFailures} consecutive checks. Triggering restart...`);
      await restartBridge();
      
      // Wait a bit before resuming checks to give the new process time to start
      log('⏳ Waiting 15 seconds for restart to settle...');
      await new Promise(r => setTimeout(r, 15000));
      consecutiveFailures = 0;
    }
  } catch (err) {
    log(`❌ Watchdog error: ${err.message}`);
    consecutiveFailures++;
  }
}

/**
 * Start the watchdog
 */
function startWatchdog() {
  log('🚀 Bridge Watchdog started');
  log(`📍 Monitoring bridge at ${BRIDGE_HOST}:${BRIDGE_PORT}`);
  log(`⏱️  Check interval: ${CHECK_INTERVAL / 1000}s`);
  log(`🔢 Failure threshold: ${FAILURE_THRESHOLD}`);
  log('---');

  // Run immediately
  watchdogLoop();

  // Then run at intervals
  setInterval(watchdogLoop, CHECK_INTERVAL);
}

// Handle signals gracefully
process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down watchdog');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('SIGINT received, shutting down watchdog');
  process.exit(0);
});

// Start the watchdog
startWatchdog();
