#!/usr/bin/env node

/**
 * QR CODE STATUS VERIFICATION & TROUBLESHOOTING GUIDE
 * 
 * This script verifies the complete QR code functionality
 * and provides detailed troubleshooting steps.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BRIDGE_URL = '3.109.154.61:3333';
const BRIDGE_SECRET = 'swar-bridge-secret-2024';

class QRDiagnostics {
  constructor() {
    this.results = [];
  }

  log(level, message) {
    const icons = {
      SUCCESS: '✅',
      ERROR: '❌',
      WARNING: '⚠️',
      INFO: 'ℹ️',
      WAITING: '⏳',
    };
    console.log(`${icons[level]} ${message}`);
    this.results.push({ level, message, timestamp: new Date().toISOString() });
  }

  async makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.getBridgeHost(),
        port: this.getBridgePort(),
        path: path,
        method: method,
        headers: {
          'X-Bridge-Secret': BRIDGE_SECRET,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
              headers: res.headers,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data,
              headers: res.headers,
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
  }

  getBridgeHost() {
    return BRIDGE_URL.split(':')[0];
  }

  getBridgePort() {
    return parseInt(BRIDGE_URL.split(':')[1]) || 3333;
  }

  async runDiagnostics() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║       QR CODE DIAGNOSTICS & TROUBLESHOOTING GUIDE      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Test 1: Bridge Connectivity
    console.log('📡 TEST 1: Bridge Connectivity');
    console.log('─────────────────────────────────');
    try {
      const status = await this.makeRequest('/status');
      this.log('SUCCESS', `Bridge responding on ${BRIDGE_URL}`);
      this.log('INFO', `Bridge Status: ${status.data?.status || 'unknown'}`);
      this.log('INFO', `QR Available: ${status.data?.hasQr === true ? 'YES' : 'NO'}`);
    } catch (err) {
      this.log('ERROR', `Bridge not responding: ${err.message}`);
      this.log('ERROR', 'Cannot proceed with QR tests');
      this.printTroubleshootingGuide();
      return;
    }

    // Test 2: QR Code Status
    console.log('\n🎫 TEST 2: QR Code Generation');
    console.log('─────────────────────────────────');
    try {
      const qr = await this.makeRequest('/qr');
      if (qr.status === 200 && qr.data?.hasQr === true) {
        this.log('SUCCESS', 'QR code is available!');
        this.log('SUCCESS', 'Users can now scan WhatsApp QR codes');
      } else if (qr.status === 400 || qr.data?.hasQr === false) {
        this.log('ERROR', 'QR code is NOT available');
        this.log('WARNING', 'This is usually caused by Chromium not being installed');
        this.printChromiumFix();
      } else {
        this.log('WARNING', `Unexpected QR status: ${qr.status}`);
        this.log('INFO', `Response: ${JSON.stringify(qr.data)}`);
      }
    } catch (err) {
      this.log('ERROR', `Cannot check QR status: ${err.message}`);
    }

    // Test 3: Bridge Health
    console.log('\n💊 TEST 3: Bridge Health');
    console.log('─────────────────────────────────');
    try {
      const health = await this.makeRequest('/health');
      if (health.status === 200) {
        this.log('SUCCESS', 'Bridge health check passed');
        this.log('INFO', `Response: ${JSON.stringify(health.data)}`);
      } else {
        this.log('WARNING', `Health check status: ${health.status}`);
      }
    } catch (err) {
      this.log('WARNING', `Cannot check health: ${err.message}`);
    }

    // Test 4: Chats Endpoint
    console.log('\n💬 TEST 4: Chats Endpoint');
    console.log('─────────────────────────────────');
    try {
      const chats = await this.makeRequest('/chats');
      if (chats.status === 200) {
        this.log('SUCCESS', 'Chats endpoint is functional');
        this.log('INFO', `Chats count: ${chats.data?.chatCount || 0}`);
      } else {
        this.log('WARNING', `Chats endpoint status: ${chats.status}`);
      }
    } catch (err) {
      this.log('WARNING', `Cannot access chats: ${err.message}`);
    }

    // Test 5: Session Status
    console.log('\n🔐 TEST 5: Session Status');
    console.log('─────────────────────────────────');
    try {
      const session = await this.makeRequest('/session');
      if (session.status === 200) {
        this.log('SUCCESS', 'Session endpoint is accessible');
        this.log('INFO', `Session ready: ${session.data?.sessionReady === true ? 'YES' : 'NO'}`);
      } else {
        this.log('WARNING', `Session status: ${session.status}`);
      }
    } catch (err) {
      this.log('INFO', `Session check: ${err.message}`);
    }

    // Test 6: Try to trigger connection
    console.log('\n🔄 TEST 6: Triggering Connection (if needed)');
    console.log('─────────────────────────────────');
    try {
      const qr = await this.makeRequest('/qr');
      if (qr.data?.hasQr === false) {
        this.log('WAITING', 'Attempting to initialize connection...');
        const connect = await this.makeRequest('/connect', 'POST');
        if (connect.status === 200) {
          this.log('INFO', 'Connection initialization triggered');
          this.log('WAITING', 'Waiting 12 seconds for QR generation...');
          
          await new Promise(resolve => setTimeout(resolve, 12000));

          const qr2 = await this.makeRequest('/qr');
          if (qr2.data?.hasQr === true) {
            this.log('SUCCESS', '✨ QR code generated successfully!');
          } else {
            this.log('ERROR', 'QR code still not available after initialization');
            this.log('ERROR', 'This indicates Chromium is not installed');
            this.printChromiumFix();
          }
        }
      } else if (qr.data?.hasQr === true) {
        this.log('SUCCESS', 'QR code is already available');
      }
    } catch (err) {
      this.log('ERROR', `Connection trigger failed: ${err.message}`);
    }

    // Final Summary
    this.printSummary();
  }

  printChromiumFix() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           CHROMIUM INSTALLATION REQUIRED               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('The QR code feature requires Chromium browser on EC2.');
    console.log('\n🔧 AUTOMATED FIX AVAILABLE:\n');
    console.log('Option 1: Run the dedicated fix script');
    console.log('  $ bash scripts/fix-qr-chromium.sh\n');

    console.log('Option 2: Run complete production setup (recommended)');
    console.log('  $ bash setup-permanent-solution.sh\n');

    console.log('Option 3: Manual SSH installation (if you have SSH key)');
    console.log('  $ ssh -i your-key.pem ubuntu@3.109.154.61');
    console.log('  $ sudo apt-get update');
    console.log('  $ sudo apt-get install -y chromium-browser');
    console.log('  $ cd ~/swaryoga-bridge');
    console.log('  $ PUPPETEER_SKIP_DOWNLOAD=true npm ci');
    console.log('  $ pm2 restart wa-bridge\n');

    console.log('ℹ️  NOTE: The complete setup script handles everything automatically.\n');
  }

  printTroubleshootingGuide() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║          BRIDGE CONNECTIVITY TROUBLESHOOTING           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('The bridge is not responding. This could be caused by:\n');

    console.log('1️⃣  EC2 INSTANCE DOWN');
    console.log('   - Check if instance i-0d2fb8b38cb190ffe is running');
    console.log('   - AWS Console → EC2 → Instances → i-0d2fb8b38cb190ffe\n');

    console.log('2️⃣  SECURITY GROUP ISSUE');
    console.log('   - Port 3333 must be open to your IP');
    console.log('   - Check security group sg-0ebce8ebe37dc8e71\n');

    console.log('3️⃣  BRIDGE PROCESS CRASHED');
    console.log('   - Log in to EC2 and check PM2 status');
    console.log('   - $ pm2 status');
    console.log('   - $ pm2 restart wa-bridge\n');

    console.log('4️⃣  RUN COMPLETE SETUP');
    console.log('   $ bash setup-permanent-solution.sh\n');
  }

  printSummary() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              DIAGNOSTIC SUMMARY & ACTIONS              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const successCount = this.results.filter(r => r.level === 'SUCCESS').length;
    const errorCount = this.results.filter(r => r.level === 'ERROR').length;

    console.log(`Tests Passed: ${successCount}`);
    console.log(`Tests Failed: ${errorCount}\n`);

    if (errorCount === 0) {
      console.log('🎉 All tests passed! QR code should be working.');
      console.log('\nAccess it at:');
      console.log('  https://crm.swaryoga.com/admin/crm/qr\n');
    } else {
      console.log('⚠️  Some tests failed. See above for recommended fixes.\n');
    }

    console.log('📊 NEXT STEPS:');
    console.log('─────────────────────────────────\n');

    if (this.results.some(r => r.message.includes('Chromium'))) {
      console.log('1. Install Chromium:');
      console.log('   $ bash scripts/fix-qr-chromium.sh');
      console.log('   OR');
      console.log('   $ bash setup-permanent-solution.sh\n');
    }

    console.log('2. Wait 2-3 minutes for bridge to initialize\n');

    console.log('3. Re-run this diagnostic:');
    console.log('   $ node scripts/verify-qr-status.js\n');

    console.log('4. Test in browser:');
    console.log('   https://crm.swaryoga.com/admin/crm/qr\n');

    // Save report
    const reportPath = '/tmp/qr-diagnostic-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}\n`);
  }
}

// Run diagnostics
const diag = new QRDiagnostics();
diag.runDiagnostics().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
