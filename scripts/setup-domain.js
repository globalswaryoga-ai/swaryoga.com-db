#!/usr/bin/env node

/**
 * Domain Setup Script for Swar Yoga CRM
 * Configures the application to work on a custom domain
 * Updates bridge, API, and client URLs
 */

const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '../.env.local');

function updateEnvFile(domain, bridgeIP) {
  if (!fs.existsSync(envFile)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }

  let content = fs.readFileSync(envFile, 'utf-8');
  
  // Determine protocol
  const isLocal = domain.includes('localhost') || domain.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';
  
  // Update NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL
  // On domain, point to bridge IP or domain bridge
  const bridgeUrl = isLocal 
    ? 'http://localhost:3333'
    : (bridgeIP 
      ? `http://${bridgeIP}:3333`
      : `https://bridge.${domain}`);

  const updates = [
    {
      pattern: /NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=.*/,
      replacement: `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=${bridgeUrl}`
    },
    {
      pattern: /WHATSAPP_BRIDGE_HTTP_URL=.*/,
      replacement: `WHATSAPP_BRIDGE_HTTP_URL=${bridgeUrl}`
    },
    {
      pattern: /NEXT_BASE_URL=.*/,
      replacement: `NEXT_BASE_URL=${protocol}://${domain}`
    },
    {
      pattern: /NEXTAUTH_URL=.*/,
      replacement: `NEXTAUTH_URL=${protocol}://${domain}`
    },
    {
      pattern: /NEXT_PUBLIC_APP_URL=.*/,
      replacement: `NEXT_PUBLIC_APP_URL=${protocol}://${domain}`
    }
  ];

  updates.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
    } else {
      // Add if not found
      content += `\n${replacement}`;
    }
  });

  fs.writeFileSync(envFile, content);
  
  console.log(`✅ Updated .env.local for domain: ${domain}\n`);
  console.log('Configuration:');
  console.log(`  Domain: ${protocol}://${domain}`);
  console.log(`  Bridge: ${bridgeUrl}`);
  
  if (!isLocal && !bridgeIP) {
    console.log('\n⚠️  Note: Bridge URL set to https://bridge.yourdomain');
    console.log('Make sure to configure bridge subdomain DNS and SSL.\n');
  }
}

function showUsage() {
  console.log(`
🌐 Domain Setup for Swar Yoga CRM

Usage:
  node setup-domain.js <domain> [bridge-ip]

Examples:
  # Local development
  node setup-domain.js localhost:3020
  
  # Production with EC2 bridge
  node setup-domain.js crm.swaryoga.com 13.51.112.100
  
  # Production with bridge on same domain
  node setup-domain.js crm.swaryoga.com

Ports:
  - App: 3000/3020 (local) or 443 (production)
  - Bridge: 3333 (local or EC2)

After setup:
  1. npm run dev                  # For local testing
  2. npm run build && npm start   # For production
  3. Ensure bridge is running on specified IP or domain
  `);
}

const args = process.argv.slice(2);
const domain = args[0];
const bridgeIP = args[1];

if (!domain) {
  showUsage();
  process.exit(1);
}

updateEnvFile(domain, bridgeIP);
