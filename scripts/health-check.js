#!/usr/bin/env node

/**
 * Health Check Utility
 * Checks if localhost, MongoDB, and API endpoints are working
 * Run at dev server startup
 */

const http = require('http');
const https = require('https');
const mongoose = require('mongoose');
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

/**
 * Runtime checks. Also holds an internal `_detectedPort` field used to target the correct dev server.
 */
const checks = {
  localhost: false,
  bunny: false,
  mongodb: false,
  api: false,
  _detectedPort: 3000,
};

const results = {
  localhost: null,
  bunny: null,
  mongodb: null,
  api: null,
};

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║          🏥 DEVELOPMENT ENVIRONMENT HEALTH CHECK          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Next.js dev server will auto-pick another port if 3000 is busy.
// Also, another process might be on 3000 returning 500 (common when multiple Next servers run).
// We'll try to discover the active Next server by probing /api/health across a range.
const DEFAULT_DEV_PORT = parseInt(process.env.NEXT_PORT || process.env.PORT || '3000', 10);

async function probePort(port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: '/api/health',
        method: 'GET',
        timeout: 1200,
      },
      (res) => {
        // Consider any non-5xx response as "this is a server speaking HTTP".
        // Prefer 200 for the health route when possible.
        resolve({ port, statusCode: res.statusCode || 0 });
      }
    );
    req.on('error', () => resolve({ port, statusCode: 0 }));
    req.on('timeout', () => {
      try { req.destroy(); } catch (e) {}
      resolve({ port, statusCode: 0 });
    });
    req.end();
  });
}

async function detectDevPort() {
  // 1) If NEXT_PORT/PORT was supplied, try it first.
  const first = await probePort(DEFAULT_DEV_PORT);
  if (first.statusCode && first.statusCode < 500) return DEFAULT_DEV_PORT;

  // 2) Otherwise, scan a small localhost range.
  // Note: keep it small/fast to avoid slowing startup.
  const candidates = [];
  for (let p = 3000; p <= 3010; p++) candidates.push(p);

  const probed = await Promise.all(candidates.map((p) => probePort(p)));

  // Prefer a 200 from /api/health.
  const ok = probed.find((r) => r.statusCode === 200);
  if (ok) return ok.port;

  // Fall back to the first non-5xx HTTP response.
  const any = probed.find((r) => r.statusCode && r.statusCode < 500);
  return any ? any.port : DEFAULT_DEV_PORT;
}

// Check 1: Bunny Database Connection
const checkBunnyDB = async () => {
  const url = process.env.BUNNY_DATABASE_URL;
  const token = process.env.BUNNY_DATABASE_AUTH_TOKEN;
  if (!url || !token) {
    results.bunny = '⚠️  BUNNY_DATABASE_URL or BUNNY_DATABASE_AUTH_TOKEN not set';
    return;
  }
  try {
    const { createClient } = require('@libsql/client');
    const client = createClient({ url, authToken: token });
    await client.execute('SELECT 1');
    client.close();
    results.bunny = '✅ Connected successfully';
    checks.bunny = true;
  } catch (err) {
    results.bunny = `❌ ${err.message || String(err)}`;
  }
};

// Check 2: MongoDB Connection
const checkMongoDB = async () => {
  const isBunnyOnly = process.env.USE_BUNNY_DATABASE_ONLY === 'true' || process.env.DISABLE_MONGODB === 'true';
  if (isBunnyOnly) {
    results.mongodb = 'ℹ️  Disabled (Using Bunny Database only)';
    checks.mongodb = true;
    return;
  }
  try {
    const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      results.mongodb = '⚠️  MONGODB_URI or MONGODB_URI_MAIN not set in .env or .env.local';
      return;
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000,
    });

    await mongoose.disconnect();
    results.mongodb = '✅ Connected successfully';
    checks.mongodb = true;
  } catch (err) {
    const message = err.message || String(err);
    if (message.includes('ENOTFOUND')) {
      results.mongodb = '❌ Cannot resolve MongoDB host (check MONGODB_URI)';
    } else if (message.includes('authentication')) {
      results.mongodb = '❌ Authentication failed (check credentials)';
    } else if (message.includes('ECONNREFUSED')) {
      results.mongodb = '❌ Connection refused (MongoDB not running)';
    } else {
      results.mongodb = `❌ ${message.split('\n')[0]}`;
    }
  }
};

// Check 2: Localhost Dev Server
const checkLocalhost = async () => {
  return new Promise((resolve) => {
    const DEV_BASE = `http://localhost:${checks._detectedPort}`;
    const timeout = setTimeout(() => {
      results.localhost = '⏳ Dev server not ready yet (still starting)';
      resolve();
    }, 3000);

    const req = http.get(DEV_BASE, (res) => {
      clearTimeout(timeout);
      if (res.statusCode === 200 || res.statusCode === 404) {
        results.localhost = `✅ Running on ${DEV_BASE}`;
        checks.localhost = true;
      } else {
        results.localhost = `❌ Unexpected status: ${res.statusCode}`;
      }
      resolve();
    });

    req.on('error', () => {
      clearTimeout(timeout);
      results.localhost = '⏳ Dev server starting... (try again in 5s)';
      resolve();
    });
  });
};

// Check 3: API Endpoint
const checkAPI = async () => {
  return new Promise((resolve) => {
    const DEV_PORT = checks._detectedPort;
    const options = {
      hostname: 'localhost',
      port: DEV_PORT,
      path: '/api/health',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      const code = res.statusCode || 0;

      // In Next dev, 404 during warm-up is acceptable and still proves the server is reachable.
      // Any non-5xx status means "API routes are reachable".
      if (code === 200) {
        results.api = '✅ Health endpoint responding';
        checks.api = true;
      } else if (code === 404) {
        results.api = '✅ API reachable (warming up)';
        checks.api = true;
      } else if (code > 0 && code < 500) {
        results.api = `✅ API reachable (status ${code})`;
        checks.api = true;
      } else {
        results.api = `⚠️  Status ${code || 'unknown'}`;
      }
      resolve();
    });

    req.on('error', () => {
      results.api = '⏳ API not ready yet (dev server still starting)';
      resolve();
    });

    req.on('timeout', () => {
      results.api = '⏳ API timeout (server starting)';
      resolve();
    });

    // Important: actually send the request.
    req.end();
  });
};

// Main health check function
const runHealthCheck = async () => {
  console.log('📊 Checking services...\n');

  // Detect which localhost port is the *actual* dev server.
  // We store it on checks object (private field) to avoid refactoring the whole file.
  checks._detectedPort = await detectDevPort();

  // Run checks in parallel
  await Promise.all([checkLocalhost(), checkBunnyDB(), checkMongoDB(), checkAPI()]);

  const isBunnyOnly = process.env.USE_BUNNY_DATABASE_ONLY === 'true' || process.env.DISABLE_MONGODB === 'true';

  // Display results
  console.log('📋 Status Report:\n');
  console.log(`  Localhost:      ${results.localhost}`);
  console.log(`  Bunny Database: ${results.bunny}`);
  console.log(`  MongoDB:        ${results.mongodb}`);
  console.log(`  API Endpoints:  ${results.api}\n`);

  // Summary
  const dbOk = isBunnyOnly ? checks.bunny : (checks.bunny || checks.mongodb);
  const allGood = checks.localhost && dbOk && checks.api;
  const partialGood = checks.localhost || checks.bunny || checks.mongodb || checks.api;

  if (allGood) {
    console.log('✨ All systems ready for development!\n');
  } else if (partialGood) {
    console.log('⚠️  Some services still loading... Give the dev server a moment.\n');
  } else {
    console.log('⚠️  Services initializing. Run this check again in a few seconds.\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  if (!checks.bunny) {
    console.log('💡 Bunny Database Tips:');
    console.log('   • Verify BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN in .env.local\n');
  }

  if (!checks.mongodb && !isBunnyOnly) {
    console.log('💡 MongoDB Tips:');
    console.log('   • Set USE_BUNNY_DATABASE_ONLY=true in .env.local to run without MongoDB');
    console.log('   • Or verify Atlas IP whitelist if using MongoDB\n');
  }

  if (!checks.localhost) {
    console.log('💡 Localhost Tips:');
    console.log('   • Dev server is starting up (this is normal)');
    console.log('   • Wait a few more seconds and try again\n');
  }

  const hasBunny = !!(process.env.BUNNY_DATABASE_URL && process.env.BUNNY_DATABASE_AUTH_TOKEN);
  const hasMongo = !!(process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI);
  console.log('📝 Environment:\n');
  console.log(`   Node Version:    ${process.version}`);
  console.log(`   Database Mode:   ${isBunnyOnly ? 'Bunny Only' : 'Hybrid'}`);
  console.log(`   Bunny DB:        ${hasBunny ? '✅ Configured' : '❌ Not set'}`);
  console.log(`   MongoDB URI:     ${hasMongo ? '✅ Set' : '❌ Not set'}`);
  console.log(`   JWT Secret:      ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
  console.log('\n');
};

// Run health check
runHealthCheck().catch(console.error);
