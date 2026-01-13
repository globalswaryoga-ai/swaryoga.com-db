#!/usr/bin/env node

/**
 * Domain Configuration Setup Script
 * Updates app configuration to work on domain
 * Supports multi-environment setup (localhost, staging, production)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0] || 'show';
const domain = args[1] || 'localhost:3020';

const envFile = path.join(__dirname, '../.env.local');

// Read current env
function readEnv() {
  if (!fs.existsSync(envFile)) {
    console.log('No .env.local file found');
    return {};
  }
  const content = fs.readFileSync(envFile, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      env[key] = valueParts.join('=');
    }
  });
  return env;
}

function writeEnv(env) {
  const lines = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .sort();
  fs.writeFileSync(envFile, lines.join('\n') + '\n');
}

function updateDomain(targetDomain) {
  const env = readEnv();
  
  // Determine protocol
  const protocol = targetDomain.includes('localhost') || targetDomain.includes('127.0.0.1') 
    ? 'http' 
    : 'https';

  const fullUrl = `${protocol}://${targetDomain}`;

  console.log(`🔄 Updating domain configuration to: ${fullUrl}\n`);

  // Update relevant env variables
  const updates = {
    'NEXT_BASE_URL': fullUrl,
    'NEXTAUTH_URL': fullUrl,
    'WHATSAPP_BRIDGE_URL': protocol === 'https' ? `https://bridge.${targetDomain}` : 'http://localhost:3333',
    'WHATSAPP_BRIDGE_HTTP_URL': 'http://localhost:3333',
    'NEXT_PUBLIC_APP_URL': fullUrl,
  };

  Object.assign(env, updates);
  writeEnv(env);

  console.log('✅ Configuration updated:\n');
  Object.entries(updates).forEach(([key, value]) => {
    console.log(`  ${key} = ${value}`);
  });
}

function showConfig() {
  const env = readEnv();
  console.log('\n🌐 Current Domain Configuration\n');
  const relevantKeys = [
    'NEXT_BASE_URL',
    'NEXTAUTH_URL', 
    'NEXT_PUBLIC_APP_URL',
    'WHATSAPP_BRIDGE_URL',
    'WHATSAPP_BRIDGE_HTTP_URL',
  ];
  
  relevantKeys.forEach(key => {
    const value = env[key] || '(not set)';
    console.log(`${key}: ${value}`);
  });
}

function listEnvironments() {
  console.log('\n📋 Available Environment Configurations\n');
  console.log('Local Development:');
  console.log('  npm run domain:set -- localhost:3020\n');
  
  console.log('Staging:');
  console.log('  npm run domain:set -- staging.swaryoga.com\n');
  
  console.log('Production:');
  console.log('  npm run domain:set -- app.swaryoga.com\n');
}

// Main
if (command === 'show') {
  showConfig();
} else if (command === 'set') {
  if (!domain) {
    console.error('❌ Domain required: npm run domain:set -- <domain>');
    process.exit(1);
  }
  updateDomain(domain);
} else if (command === 'list') {
  listEnvironments();
} else {
  console.log(`
🌐 Domain Configuration Manager

Usage:
  npm run domain:show       - Show current configuration
  npm run domain:set -- <domain>  - Update to new domain
  npm run domain:list       - List common configurations

Examples:
  npm run domain:set -- localhost:3020
  npm run domain:set -- staging.swaryoga.com
  npm run domain:set -- app.swaryoga.com
  `);
}
