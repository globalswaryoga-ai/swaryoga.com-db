#!/usr/bin/env node

/**
 * WhatsApp Bridge Health Monitor & Auto-Repair System
 * - Monitors bridge health every 30 seconds
 * - Auto-restarts bridge if down
 * - Maintains QR code freshness
 * - Auto-heals connection issues
 */

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds between retries

const LOG_FILE = path.join(__dirname, '../logs/bridge-health.log');
const STATUS_FILE = path.join(__dirname, '../.bridge-status');

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
}

function updateStatus(status) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      bridgeUrl: BRIDGE_URL,
    }, null, 2));
  } catch (err) {
    log('WARN', `Failed to update status file: ${err.message}`);
  }
}

async function checkBridgeHealth() {
  return new Promise((resolve) => {
    const urlObj = new URL(BRIDGE_URL);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/health',
      method: 'GET',
      timeout: 5000,
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          // 404 is OK - means bridge is responding but doesn't have /health
          resolve({ healthy: true, statusCode: res.statusCode, data });
        } else {
          resolve({ healthy: false, statusCode: res.statusCode, data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ healthy: false, error: 'Timeout' });
    });

    req.on('error', (err) => {
      resolve({ healthy: false, error: err.message });
    });

    req.end();
  });
}

async function checkQRStatus() {
  return new Promise((resolve) => {
    const urlObj = new URL(BRIDGE_URL);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/qr',
      method: 'GET',
      timeout: 5000,
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, hasQR: data.length > 100 });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: null, hasQR: false });
    });

    req.on('error', (err) => {
      resolve({ statusCode: null, hasQR: false, error: err.message });
    });

    req.end();
  });
}

async function restartBridge() {
  try {
    log('INFO', '🔄 Attempting to restart bridge...');
    
    // Try Docker restart first
    try {
      execSync('docker restart whatsapp-bridge 2>/dev/null', { stdio: 'pipe' });
      log('INFO', '✅ Docker container restarted successfully');
      await new Promise(r => setTimeout(r, 5000)); // Wait for restart
      return true;
    } catch (dockerErr) {
      log('WARN', `Docker restart failed: ${dockerErr.message}`);
    }

    // Try systemd restart
    try {
      execSync('systemctl restart whatsapp-bridge 2>/dev/null', { stdio: 'pipe' });
      log('INFO', '✅ Service restarted successfully');
      await new Promise(r => setTimeout(r, 5000));
      return true;
    } catch (systemdErr) {
      log('WARN', `Systemd restart failed: ${systemdErr.message}`);
    }

    // Try PM2 restart
    try {
      execSync('pm2 restart whatsapp-bridge 2>/dev/null', { stdio: 'pipe' });
      log('INFO', '✅ PM2 process restarted successfully');
      await new Promise(r => setTimeout(r, 5000));
      return true;
    } catch (pm2Err) {
      log('WARN', `PM2 restart failed: ${pm2Err.message}`);
    }

    log('ERROR', '❌ All restart methods failed');
    return false;
  } catch (err) {
    log('ERROR', `Bridge restart error: ${err.message}`);
    return false;
  }
}

async function refreshQRCode() {
  return new Promise((resolve) => {
    const urlObj = new URL(BRIDGE_URL);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/refresh-qr',
      method: 'POST',
      timeout: 5000,
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(res.statusCode === 200 || res.statusCode === 201);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.end();
  });
}

let consecutiveFailures = 0;
let lastHealthStatus = 'unknown';

async function monitorBridge() {
  try {
    const health = await checkBridgeHealth();
    const qr = await checkQRStatus();

    if (health.healthy) {
      consecutiveFailures = 0;
      lastHealthStatus = 'healthy';
      log('INFO', `✅ Bridge healthy [${health.statusCode}] | QR: ${qr.hasQR ? '✓' : '✗'}`);
      updateStatus('healthy');

      // Refresh QR if it's stale
      if (!qr.hasQR) {
        log('WARN', '📱 QR code missing, refreshing...');
        const refreshed = await refreshQRCode();
        if (refreshed) {
          log('INFO', '✅ QR code refreshed');
        }
      }
    } else {
      consecutiveFailures++;
      lastHealthStatus = 'unhealthy';
      
      log('WARN', `⚠️  Bridge health check failed (${consecutiveFailures}/${MAX_RETRIES}): ${health.error || `Status ${health.statusCode}`}`);
      updateStatus('unhealthy');

      if (consecutiveFailures >= MAX_RETRIES) {
        log('ERROR', `🚨 Bridge down for ${consecutiveFailures} checks. Auto-restarting...`);
        const restarted = await restartBridge();
        
        if (restarted) {
          consecutiveFailures = 0;
          log('INFO', '✅ Bridge restart completed, resuming monitoring...');
          updateStatus('restarted');
        } else {
          log('CRITICAL', '❌ Bridge restart failed! Manual intervention needed.');
          updateStatus('critical');
        }
      }
    }
  } catch (err) {
    log('ERROR', `Monitor error: ${err.message}`);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('INFO', '🛑 Bridge health monitor shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', '🛑 Bridge health monitor terminated...');
  process.exit(0);
});

// Start monitoring
log('INFO', `🚀 Bridge Health Monitor started for ${BRIDGE_URL}`);
log('INFO', `⏱️  Check interval: ${CHECK_INTERVAL / 1000}s | Max retries: ${MAX_RETRIES}`);
monitorBridge();
setInterval(monitorBridge, CHECK_INTERVAL);
