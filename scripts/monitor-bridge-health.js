#!/usr/bin/env node

/**
 * Bridge Service Health Monitor
 * Monitors EC2 WhatsApp QR bridge and alerts if connection is lost
 * Runs on local dev machine to detect bridge issues
 */

const http = require('http');
const https = require('https');

const BRIDGE_IP = '52.91.198.23';
const BRIDGE_PORT = 3333;
const BRIDGE_URL = `http://${BRIDGE_IP}:${BRIDGE_PORT}`;
const CHECK_INTERVAL = 60000; // 60 seconds between checks
const TIMEOUT = 5000;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

let lastStatus = null;
let downSince = null;

async function checkBridgeHealth() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = http.request(
      `${BRIDGE_URL}/health`,
      {
        method: 'GET',
        timeout: TIMEOUT,
        headers: {
          'x-bridge-secret': 'swar-bridge-secret-2024',
          'User-Agent': 'SwarYoga-Monitor/1.0'
        }
      },
      (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode === 200 && json.status === 'connected') {
              resolve({
                status: 'connected',
                sessionReady: json.sessionReady || false,
                responseTime: responseTime,
                raw: json
              });
            } else {
              resolve({
                status: 'unhealthy',
                statusCode: res.statusCode,
                responseTime: responseTime,
                message: json.message || 'Unknown status'
              });
            }
          } catch (e) {
            resolve({
              status: 'error',
              error: 'Invalid JSON response',
              responseTime: responseTime
            });
          }
        });
      }
    );
    
    client.on('timeout', () => {
      client.destroy();
      resolve({
        status: 'timeout',
        error: 'Health check timed out'
      });
    });
    
    client.on('error', (error) => {
      resolve({
        status: 'error',
        error: error.code || error.message
      });
    });
    
    client.end();
  });
}

async function checkBridgeQR() {
  return new Promise((resolve) => {
    const client = http.request(
      `${BRIDGE_URL}/qr`,
      {
        method: 'GET',
        timeout: TIMEOUT,
        headers: {
          'x-bridge-secret': 'swar-bridge-secret-2024'
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              hasQR: !!json.qrCode,
              ready: json.ready || false,
              raw: json
            });
          } catch (e) {
            resolve({ error: 'Invalid QR response' });
          }
        });
      }
    );
    
    client.on('error', (error) => {
      resolve({ error: error.code });
    });
    
    client.on('timeout', () => {
      client.destroy();
      resolve({ error: 'timeout' });
    });
    
    client.end();
  });
}

async function performHealthCheck() {
  const healthResult = await checkBridgeHealth();
  
  if (healthResult.status === 'connected') {
    const qrResult = await checkBridgeQR();
    
    const statusChanged = lastStatus !== 'connected';
    if (statusChanged) {
      downSince = null;
    }
    
    console.log(`${colors.green}✅${colors.reset} [${getTimestamp()}] Bridge is CONNECTED`);
    console.log(`   ${colors.blue}Session:${colors.reset} ${healthResult.sessionReady ? '✓ Ready' : '⏳ Initializing'}`);
    console.log(`   ${colors.blue}QR Code:${colors.reset} ${qrResult.hasQR ? '✓ Available' : '✗ Not available'}`);
    console.log(`   ${colors.blue}Response Time:${colors.reset} ${healthResult.responseTime}ms`);
    
    lastStatus = 'connected';
    
  } else if (healthResult.status === 'timeout' || healthResult.status === 'error') {
    const statusChanged = lastStatus !== 'disconnected';
    
    if (statusChanged) {
      downSince = new Date();
      console.log(`\n${colors.red}❌${colors.reset} [${getTimestamp()}] Bridge is DOWN!`);
      console.log(`   ${colors.red}Error:${colors.reset} ${healthResult.error}`);
      console.log(`   ${colors.magenta}⚠️  QR Connection will fail until bridge recovers${colors.reset}\n`);
    } else {
      const downTime = Math.round((Date.now() - downSince) / 1000);
      console.log(`${colors.red}❌${colors.reset} [${getTimestamp()}] Still DOWN (${downTime}s)`);
    }
    
    lastStatus = 'disconnected';
    
  } else {
    console.log(`${colors.yellow}⚠️ ${colors.reset} [${getTimestamp()}] Bridge status unknown`);
    console.log(`   ${colors.yellow}Status:${colors.reset} ${healthResult.status}`);
    console.log(`   ${colors.yellow}Message:${colors.reset} ${healthResult.message || healthResult.error || 'No details'}`);
    
    lastStatus = 'unknown';
  }
}

function getTimestamp() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

// ============================================================
// Main
// ============================================================

console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║   WhatsApp QR Bridge Health Monitor                ║${colors.reset}`);
console.log(`${colors.cyan}╚═══════════════════════════════════════════════════╝${colors.reset}\n`);
console.log(`   📍 Monitoring: ${colors.blue}${BRIDGE_URL}${colors.reset}`);
console.log(`   ⏱️  Check interval: ${colors.blue}${CHECK_INTERVAL / 1000}s${colors.reset}`);
console.log(`   🔐 Instance: ${colors.blue}wa-bridge-prod-v2${colors.reset} (i-0cbb6320079b903d8)\n`);

// Check immediately
performHealthCheck();

// Check periodically
setInterval(performHealthCheck, CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⏹️  Monitor stopped${colors.reset}\n`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}⏹️  Monitor terminated${colors.reset}\n`);
  process.exit(0);
});
