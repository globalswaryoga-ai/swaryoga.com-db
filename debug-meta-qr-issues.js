#!/usr/bin/env node

/**
 * Debug script to diagnose Meta WhatsApp incoming and QR button issues
 * Run: node debug-meta-qr-issues.js
 */

const http = require('http');
const https = require('https');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(label, msg, color = 'reset') {
  console.log(`${colors[color]}[${label}]${colors.reset} ${msg}`);
}

// Test function
async function testEndpoint(url, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'User-Agent': 'Debug-Script/1.0',
        ...headers,
      },
      timeout: 5000,
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 200),
          ok: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: null,
        error: err.message,
        ok: false,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: null,
        error: 'Timeout (5s)',
        ok: false,
      });
    });

    req.end();
  });
}

async function main() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║      META WHATSAPP & QR LOGIN DIAGNOSTIC REPORT           ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'https://wa-bridge.swaryoga.com';
  const localUrl = 'http://localhost:3000';

  // 1. Check WhatsApp Bridge
  log('CHECK', 'Testing WhatsApp Bridge connectivity...', 'blue');
  const bridgeStatus = await testEndpoint(`${bridgeUrl}/api/status`);
  if (bridgeStatus.ok) {
    log('✓ BRIDGE', 'WhatsApp Bridge is ONLINE ✓', 'green');
    log('RESPONSE', bridgeStatus.body, 'green');
  } else {
    log('✗ BRIDGE', `WhatsApp Bridge is OFFLINE: ${bridgeStatus.error}`, 'red');
    log('ADVICE', 'Start the WhatsApp bridge service or check WHATSAPP_BRIDGE_HTTP_URL env var', 'yellow');
  }

  // 2. Check Local QR Endpoint
  log('CHECK', 'Testing local QR endpoint...', 'blue');
  const qrStatus = await testEndpoint(`${localUrl}/api/admin/crm/whatsapp/qr`, 'GET', {
    'Authorization': 'Bearer test-token',
  });
  if (qrStatus.ok) {
    log('✓ QR API', 'QR endpoint is responding ✓', 'green');
  } else if (qrStatus.status === 401) {
    log('ℹ QR API', 'QR endpoint requires valid auth token (expected)', 'cyan');
  } else {
    log('✗ QR API', `QR endpoint error: ${qrStatus.error}`, 'red');
  }

  // 3. Check Meta Messages Endpoint
  log('CHECK', 'Testing Meta messages endpoint...', 'blue');
  const metaStatus = await testEndpoint(`${localUrl}/api/admin/crm/whatsapp/meta/messages`, 'GET', {
    'Authorization': 'Bearer test-token',
  });
  if (metaStatus.ok) {
    log('✓ META API', 'Meta messages endpoint is responding ✓', 'green');
  } else if (metaStatus.status === 401) {
    log('ℹ META API', 'Meta endpoint requires valid auth token (expected)', 'cyan');
  } else if (metaStatus.status === 404) {
    log('⚠ META API', 'Meta endpoint is DISABLED (check env: WHATSAPP_DISABLE_META_*)', 'yellow');
  } else {
    log('✗ META API', `Meta endpoint error: ${metaStatus.error}`, 'red');
  }

  // 4. Environment Check
  log('CHECK', 'Checking environment variables...', 'blue');
  const envChecks = {
    'WHATSAPP_BRIDGE_HTTP_URL': process.env.WHATSAPP_BRIDGE_HTTP_URL,
    'WHATSAPP_DISABLE_META_UI': process.env.WHATSAPP_DISABLE_META_UI,
    'WHATSAPP_DISABLE_META_SEND': process.env.WHATSAPP_DISABLE_META_SEND,
    'WHATSAPP_DISABLE_CLOUD_SEND': process.env.WHATSAPP_DISABLE_CLOUD_SEND,
    'WHATSAPP_FORCE_WEB_BRIDGE': process.env.WHATSAPP_FORCE_WEB_BRIDGE,
    'WHATSAPP_DISABLE_CLOUD': process.env.WHATSAPP_DISABLE_CLOUD,
  };

  Object.entries(envChecks).forEach(([key, value]) => {
    const status = value ? '✓' : '○';
    const color = value ? 'green' : 'cyan';
    log(status, `${key}=${value || 'not set'}`, color);
  });

  // 5. Recommendations
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                  RECOMMENDATIONS                           ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (!bridgeStatus.ok) {
    log('STEP 1', 'Start WhatsApp Bridge Service', 'yellow');
    log('CMD', 'Check if wa-bridge is running on your server', 'cyan');
    log('URL', `Bridge should be accessible at: ${bridgeUrl}`, 'cyan');
  }

  log('STEP 2', 'Verify Environment Variables', 'yellow');
  log('CMD', 'Check .env.local file for WHATSAPP_* settings', 'cyan');

  if (bridgeStatus.ok) {
    log('STEP 3', 'Try QR Login Flow', 'yellow');
    log('URL', `Navigate to: http://localhost:3000/admin/crm/whatsapp/qr-login`, 'cyan');
  }

  log('STEP 4', 'Check for Image/Button Issues', 'yellow');
  log('ADVICE', 'If QR/images not showing:', 'cyan');
  log('  ', '• Clear browser cache (Ctrl+Shift+Delete)', 'cyan');
  log('  ', '• Check browser console (F12) for CORS errors', 'cyan');
  log('  ', '• Verify WHATSAPP_BRIDGE_HTTP_URL is correct', 'cyan');

  console.log(`\n${colors.cyan}To fix quickly:${colors.reset}\n`);
  console.log(`1. ${colors.green}Check your .env.local:${colors.reset}`);
  console.log(`   cat .env.local | grep WHATSAPP\n`);
  
  console.log(`2. ${colors.green}Restart the app:${colors.reset}`);
  console.log(`   npm run dev\n`);

  console.log(`3. ${colors.green}Visit the endpoints:${colors.reset}`);
  console.log(`   - QR: http://localhost:3000/admin/crm/whatsapp/qr-login`);
  console.log(`   - Meta: http://localhost:3000/admin/crm/whatsapp-meta\n`);
}

main().catch(console.error);
