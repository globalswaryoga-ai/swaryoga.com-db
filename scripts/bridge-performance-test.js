#!/usr/bin/env node

/**
 * Bridge Performance Diagnostic
 * Tests bridge response times for all key endpoints
 */

const http = require('http');

const BRIDGE_URL = 'http://3.109.154.61:3333';
const BRIDGE_SECRET = 'swar-bridge-secret-2024';

const endpoints = [
  { name: 'Status', path: '/status', method: 'GET' },
  { name: 'Chats', path: '/chats', method: 'GET' },
  { name: 'Messages (test)', path: '/messages/1606351380725%40c.us', method: 'GET' },
  { name: 'QR', path: '/qr', method: 'GET' },
  { name: 'Contact (test)', path: '/contact/1606351380725%40c.us', method: 'GET' },
];

async function fetchWithTiming(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(BRIDGE_URL + path);
    
    const start = Date.now();
    const req = http.request(url, {
      method,
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const duration = Date.now() - start;
        const body = Buffer.concat(chunks).toString();
        
        // Check if it's JSON or HTML (error)
        const isJson = body.trim().startsWith('{');
        
        resolve({
          status: res.statusCode,
          duration,
          size: body.length,
          isJson,
          preview: isJson ? body.substring(0, 100) : 'HTML error response'
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - start;
      reject({ error: err.message, duration });
    });

    // 15 second timeout
    req.setTimeout(15000, () => {
      req.destroy();
      reject({ error: 'Request timeout', duration: Date.now() - start });
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n📊 BRIDGE PERFORMANCE TEST');
  console.log('====================================\n');
  console.log(`Bridge: ${BRIDGE_URL}`);
  console.log(`Testing at: ${new Date().toISOString()}\n`);
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name} (${endpoint.method} ${endpoint.path})...`);
      const result = await fetchWithTiming(endpoint.path, endpoint.method);
      
      const speed = result.duration < 500 ? '⚡ FAST' : result.duration < 2000 ? '🟡 SLOW' : '🔴 VERY SLOW';
      console.log(`  ${speed}: ${result.duration}ms`);
      console.log(`  Status: ${result.status} | Size: ${result.size} bytes`);
      console.log(`  Response: ${result.isJson ? 'JSON ✓' : 'HTML error ✗'}`);
      if (result.isJson && result.duration > 500) {
        console.log(`  Preview: ${result.preview}...`);
      }
      console.log('');
    } catch (err) {
      console.log(`  🔴 ERROR: ${err.error}`);
      if (err.duration) {
        console.log(`  Duration: ${err.duration}ms`);
      }
      console.log('');
    }
  }

  console.log('\n📈 SUMMARY');
  console.log('====================================');
  console.log('⚡ < 500ms = Fast');
  console.log('🟡 500ms - 2s = Slow (acceptable)');
  console.log('🔴 > 2s = Very Slow (needs optimization)');
  console.log('\nIf /messages is slow, try:');
  console.log('1. Check EC2 memory/CPU: top, free -h');
  console.log('2. Check bridge logs: pm2 logs whatsapp-bridge');
  console.log('3. Check network: ping 3.109.154.61');
  console.log('4. Reduce message polling from 12s to 5s (already done in proxy)');
  console.log('\n');
}

runTests().catch(console.error);
