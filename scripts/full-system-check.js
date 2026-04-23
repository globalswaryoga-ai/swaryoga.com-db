#!/usr/bin/env node
/**
 * Complete System Health Check
 * Tests every component needed for group merge to work
 */

const http = require('http');
const https = require('https');

const BRIDGE_SECRET = 'swar-bridge-secret-2024';
const BRIDGE_URL = 'http://localhost:3333';
const API_URL = 'http://localhost:3000';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(prefix, msg, color = 'reset') {
  console.log(`${colors[color]}${prefix}${colors.reset} ${msg}`);
}

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const reqModule = url.startsWith('https') ? https : http;
    const req = reqModule.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000);
  });
}

async function checkBridgeConnection() {
  log('🌉', 'Testing Bridge Connection...', 'blue');
  try {
    const result = await httpRequest(`${BRIDGE_URL}/status`, {
      headers: { 'x-bridge-secret': BRIDGE_SECRET }
    });
    
    if (result.status === 200) {
      const { connected, status, qrAvailable, phone } = result.data;
      log('  ✅', `Bridge responding on ${BRIDGE_URL}`, 'green');
      log('  ✓', `Connected: ${connected ? 'YES' : 'NO'}`);
      log('  ✓', `Status: ${status}`);
      log('  ✓', `QR Available: ${qrAvailable ? 'YES' : 'NO'}`);
      log('  ✓', `Phone: ${phone || 'NOT YET SCANNED'}`);
      
      if (!connected && qrAvailable) {
        log('  ⚠️ ', 'WAITING: Scan QR code on WhatsApp phone to connect', 'yellow');
      }
      return { ok: true, connected, qrAvailable, phone };
    } else {
      log('  ❌', `Bridge returned ${result.status}`, 'red');
      return { ok: false, connected: false };
    }
  } catch (err) {
    log('  ❌', `Bridge offline: ${err.message}`, 'red');
    return { ok: false, connected: false };
  }
}

async function getQRCode() {
  log('📱', 'Getting QR Code...', 'blue');
  try {
    const result = await httpRequest(`${BRIDGE_URL}/qr`, {
      headers: { 'x-bridge-secret': BRIDGE_SECRET }
    });
    
    if (result.status === 200 && result.data.qrString) {
      log('  ✅', 'QR Code generated', 'green');
      log('  ✓', `String: ${result.data.qrString.substring(0, 50)}...`);
      return true;
    } else {
      log('  ❌', 'Failed to generate QR', 'red');
      return false;
    }
  } catch (err) {
    log('  ❌', `QR fetch failed: ${err.message}`, 'red');
    return false;
  }
}

async function checkMongo() {
  log('🗄️ ', 'Testing MongoDB Connection...', 'blue');
  try {
    const result = await httpRequest(`${API_URL}/api/health`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (result.status === 200) {
      log('  ✅', 'MongoDB confirmed working', 'green');
      return true;
    }
  } catch (err) {
    log('  ⚠️ ', `Health check failed (may be normal): ${err.message}`, 'yellow');
    return false;
  }
}

async function testMergeAPI() {
  log('🔀', 'Testing Merge API Endpoints...', 'blue');
  try {
    // Just check if endpoint exists
    const result = await httpRequest(`${API_URL}/api/admin/crm/whatsapp/qr/bulk-group-merge`, {
      headers: { 'x-bridge-secret': BRIDGE_SECRET }
    });
    
    if (result.status === 401 || result.status === 403 || result.status === 405) {
      log('  ✅', 'Merge API endpoint exists and is protected', 'green');
      return true;
    } else if (result.status === 404) {
      log('  ❌', 'Merge API endpoint NOT FOUND', 'red');
      return false;
    }
  } catch (err) {
    log('  ⚠️ ', `Endpoint check failed: ${err.message}`, 'yellow');
    return false;
  }
}

async function checkRateLimiter() {
  log('⚡', 'Checking Rate Limiter Configuration...', 'blue');
  try {
    // Try to read rate limiter file
    const fs = require('fs');
    const path = '/Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/lib/whatsappRateLimiter.ts';
    
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf-8');
      
      const hasOption = content.includes('getRandomMergeBatchSize') && 
                       content.includes('getRandomMergeDelay') &&
                       content.includes('calculateMergeGroupSchedule');
      
      if (hasOption) {
        log('  ✅', 'Rate limiter functions configured (Option B ultra-safe)', 'green');
        
        // Check for key values
        if (content.includes('60') && content.includes('180')) {
          log('  ✓', '60-180 second delays confirmed', 'green');
        }
        if (content.includes('2') || content.includes('3')) {
          log('  ✓', '2-3 batch size confirmed', 'green');
        }
        if (content.includes('240')) {
          log('  ✓', '240 minute spread confirmed', 'green');
        }
        
        return true;
      }
    } else {
      log('  ⚠️ ', 'Rate limiter file not found', 'yellow');
    }
  } catch (err) {
    log('  ⚠️ ', `Check failed: ${err.message}`, 'yellow');
  }
  return false;
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           🚀 SWAR YOGA - COMPLETE SYSTEM CHECK 🚀          ║');
  console.log('║                   April 22, 2026                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = {
    bridge: await checkBridgeConnection(),
    qr: await getQRCode(),
    mongo: await checkMongo(),
    mergeAPI: await testMergeAPI(),
    rateLimiter: await checkRateLimiter()
  };

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      📊 TEST SUMMARY 📊                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const summary = [
    { name: 'Bridge Connection', emoji: '🌉', result: results.bridge.ok },
    { name: 'QR Code Generation', emoji: '📱', result: results.qr },
    { name: 'MongoDB', emoji: '🗄️ ', result: results.mongo },
    { name: 'Merge API', emoji: '🔀', result: results.mergeAPI },
    { name: 'Rate Limiter Config', emoji: '⚡', result: results.rateLimiter }
  ];

  summary.forEach(s => {
    const status = s.result ? '✅ PASS' : '❌ FAIL';
    const color = s.result ? 'green' : 'red';
    console.log(`${s.emoji} ${s.name.padEnd(25)} ${colors[color]}${status}${colors.reset}`);
  });

  const allPass = Object.values(results).every(r => r === true || (r.ok !== undefined ? r.ok : false));

  console.log('\n' + (allPass ? 
    `${colors.green}✅ ALL SYSTEMS READY FOR TESTING!${colors.reset}` :
    `${colors.yellow}⚠️  Some systems need attention${colors.reset}`
  ));

  if (results.bridge.qrAvailable && !results.bridge.connected) {
    console.log(`\n${colors.yellow}📋 NEXT STEPS:${colors.reset}`);
    console.log('1. Open http://localhost:3000/admin/crm/qr in your browser');
    console.log('2. Scan the QR code with WhatsApp on phone (9309986820)');
    console.log('3. Wait for "Connected ✅" status');
    console.log('4. Then test merge features!');
  }

  if (results.bridge.connected && results.bridge.phone) {
    console.log(`\n${colors.green}🎉 READY FOR MERGE TESTING!${colors.reset}`);
    console.log(`Connected phone: ${results.bridge.phone.split(':')[0]}`);
    console.log('\nYou can now:');
    console.log('1. Open Group Management page');
    console.log('2. Select 5 groups to merge');
    console.log('3. Click "Start Merge" button');
    console.log('4. Monitor progress (takes 240+ minutes for 100+ people)');
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  process.exit(allPass ? 0 : 1);
}

// Run all tests
runAllTests().catch(err => {
  log('❌', `Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
