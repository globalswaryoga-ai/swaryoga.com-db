#!/usr/bin/env node

/**
 * Quick Bridge Test & Diagnostics
 */

const http = require('http');
const https = require('https');

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';

async function test(endpoint, method = 'GET') {
  return new Promise((resolve) => {
    const urlObj = new URL(BRIDGE_URL + endpoint);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      timeout: 5000,
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, ok: res.statusCode < 400, data: data.substring(0, 100) });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'timeout', ok: false });
    });

    req.on('error', (err) => {
      resolve({ status: 'error', ok: false, error: err.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🔍 WhatsApp Bridge Diagnostic Test');
  console.log('===================================');
  console.log(`Bridge URL: ${BRIDGE_URL}`);
  console.log('');

  const tests = [
    { endpoint: '/health', name: 'Health Check' },
    { endpoint: '/qr', name: 'QR Code' },
    { endpoint: '/status', name: 'Status Endpoint' },
  ];

  let allOk = true;

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    const result = await test.endpoint;
    
    if (result.ok || result.status === 404) {
      console.log(`✅ [${result.status}]`);
    } else if (result.status === 'timeout') {
      console.log(`⏱️  TIMEOUT (5s)`);
      allOk = false;
    } else if (result.status === 'error') {
      console.log(`❌ ${result.error}`);
      allOk = false;
    } else {
      console.log(`⚠️  [${result.status}]`);
    }
  }

  console.log('');
  console.log('🎯 Summary:');
  console.log(`  Bridge: ${allOk ? '✅ Ready' : '⚠️  May need attention'}`);
  console.log('');
  console.log('📋 Next Steps:');
  console.log('  1. Start monitor: npm run bridge:health-monitor');
  console.log('  2. Check logs: tail -f logs/bridge-health.log');
  console.log('  3. View QR: Visit CRM admin panel');
}

runTests().catch(console.error);
