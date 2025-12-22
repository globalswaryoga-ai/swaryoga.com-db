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

const checks = {
  localhost: false,
  mongodb: false,
  api: false,
};

const results = {
  localhost: null,
  mongodb: null,
  api: null,
};

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║          🏥 DEVELOPMENT ENVIRONMENT HEALTH CHECK          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check 1: MongoDB Connection
const checkMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      results.mongodb = '⚠️  MONGODB_URI not set in .env';
      return;
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
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
    const timeout = setTimeout(() => {
      results.localhost = '⏳ Dev server not ready yet (still starting)';
      resolve();
    }, 3000);

    const req = http.get('http://localhost:3000', (res) => {
      clearTimeout(timeout);
      if (res.statusCode === 200 || res.statusCode === 404) {
        results.localhost = '✅ Running on http://localhost:3000';
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
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        results.api = '✅ Health endpoint responding';
        checks.api = true;
      } else if (res.statusCode === 404) {
        results.api = '⏳ API routes loading... (404 is normal during startup)';
      } else {
        results.api = `⚠️  Status ${res.statusCode}`;
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
  });
};

// Main health check function
const runHealthCheck = async () => {
  console.log('📊 Checking services...\n');

  // Run checks in parallel
  await Promise.all([checkLocalhost(), checkMongoDB(), checkAPI()]);

  // Display results
  console.log('📋 Status Report:\n');
  console.log(`  Localhost:    ${results.localhost}`);
  console.log(`  MongoDB:      ${results.mongodb}`);
  console.log(`  API Endpoints: ${results.api}\n`);

  // Summary
  const allGood = checks.localhost && checks.mongodb && checks.api;
  const partialGood = checks.localhost || checks.mongodb || checks.api;

  if (allGood) {
    console.log('✨ All systems ready for development!\n');
  } else if (partialGood) {
    console.log('⚠️  Some services still loading... Give the dev server a moment.\n');
  } else {
    console.log('⚠️  Services initializing. Run this check again in a few seconds.\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  // Display helpful info
  if (!checks.mongodb) {
    console.log('💡 MongoDB Tips:');
    console.log('   • Make sure MONGODB_URI is set in .env');
    console.log('   • Check MongoDB cluster is running');
    console.log('   • Verify IP whitelist includes your machine\n');
  }

  if (!checks.localhost) {
    console.log('💡 Localhost Tips:');
    console.log('   • Dev server is starting up (this is normal)');
    console.log('   • Wait a few more seconds and try again\n');
  }

  // Environment info
  console.log('📝 Environment:\n');
  console.log(`   Node Version:    ${process.version}`);
  console.log(`   MongoDB URI:     ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not set'}`);
  console.log(`   JWT Secret:      ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
  console.log('\n');
};

// Run health check
runHealthCheck().catch(console.error);
