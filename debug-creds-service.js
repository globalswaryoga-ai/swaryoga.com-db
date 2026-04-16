#!/usr/bin/env node

/**
 * Debug - Check if zoom credentials are being loaded correctly in the service
 */

// Set up dotenv BEFORE requiring the service
require('dotenv').config({ path: '.env.local' });

// Now require the service
const { getZoomAccessToken, clearTokenCache } = require('./lib/zoomBotService.ts').default ? require('./lib/zoomBotService.ts').default : {};

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 Debug: Check Credentials in ZoomBotService');
console.log('═══════════════════════════════════════════════════════════\n');

// Check env vars directly
console.log('Environment variables:');
console.log(`  ZOOM_ACCOUNT_ID: ${process.env.ZOOM_ACCOUNT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`  ZOOM_CLIENT_ID: ${process.env.ZOOM_CLIENT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`  ZOOM_CLIENT_SECRET: ${process.env.ZOOM_CLIENT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`  ZOOM_BOT_ACCOUNT_ID: ${process.env.ZOOM_BOT_ACCOUNT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`  ZOOM_BOT_CLIENT_ID: ${process.env.ZOOM_BOT_CLIENT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`  ZOOM_BOT_CLIENT_SECRET: ${process.env.ZOOM_BOT_CLIENT_SECRET ? '✅ Set' : '❌ Not set'}\n`);

// Try to import and use the service
try {
  const ts = require('typescript');
  const fs = require('fs');
  
  // Read the TypeScript file
  const serviceCode = fs.readFileSync('./lib/zoomBotService.ts', 'utf8');
  
  // Find the credentials being used in the service
  const accountIdMatch = serviceCode.match(/process\.env\.ZOOM_.*ACCOUNT_ID/g);
  const clientIdMatch = serviceCode.match(/process\.env\.ZOOM_.*CLIENT_ID/g);
  const clientSecretMatch = serviceCode.match(/process\.env\.ZOOM_.*CLIENT_SECRET/g);
  
  console.log('Service is configured to read:');
  if (accountIdMatch) console.log(`  Account ID: ${accountIdMatch[0]}`);
  if (clientIdMatch) console.log(`  Client ID: ${clientIdMatch[0]}`);
  if (clientSecretMatch) console.log(`  Client Secret: ${clientSecretMatch[0]}\n`);
  
} catch (e) {
  console.error('Error reading service:', e.message);
}

// More direct test - compare with the working test-zoom-connection.js
console.log('Direct credential comparison:');
const testCreds = {
  accountId: process.env.ZOOM_ACCOUNT_ID || process.env.ZOOM_BOT_ACCOUNT_ID,
  clientId: process.env.ZOOM_CLIENT_ID || process.env.ZOOM_BOT_CLIENT_ID,
  clientSecret: process.env.ZOOM_CLIENT_SECRET || process.env.ZOOM_BOT_CLIENT_SECRET,
};

console.log(`  Account ID present: ${testCreds.accountId ? '✅ ' + testCreds.accountId.substring(0, 10) + '...' : '❌ No'}`);
console.log(`  Client ID present: ${testCreds.clientId ? '✅ ' + testCreds.clientId.substring(0, 10) + '...' : '❌ No'}`);
console.log(`  Client Secret present: ${testCreds.clientSecret ? '✅ ' + testCreds.clientSecret.substring(0, 10) + '...' : '❌ No'}\n`);

console.log('Try using axios directly (like test-zoom-connection.js does):');

const axios = require('axios');

async function testDirect() {
  try {
    const auth = Buffer.from(`${testCreds.clientId}:${testCreds.clientSecret}`).toString('base64');
    console.log(`Auth header created: ${auth ? '✅ Yes' : '❌ No'}`);
    
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=account_credentials&account_id=${testCreds.accountId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );
    
    console.log(`✅ Token received: ${response.data.access_token ? response.data.access_token.substring(0, 30) + '...' : 'ERROR'}`);
    
  } catch (error) {
    console.error(`❌ Token error: ${error.response?.data?.error || error.message}`);
  }
}

testDirect();
