#!/usr/bin/env node

/**
 * Development Server Startup with EC2 Status Check
 * This script displays AWS EC2 status before starting the Next.js dev server
 */

const { displayStatus } = require('./ec2-status.js');
const { spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const startDevServer = async () => {
  // Display EC2 status first
  await displayStatus();

  console.log(`${colors.bright}${colors.green}🚀 Starting development server...${colors.reset}\n`);

  // Set environment variables
  process.env.PORT = '3000';

  // Spawn the Next.js dev server
  const nextDev = spawn('next', ['dev', '--port', '3000'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' },
  });

  // Handle process signals
  process.on('SIGINT', () => {
    console.log(`\n${colors.cyan}Shutting down development server...${colors.reset}`);
    nextDev.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    nextDev.kill();
    process.exit(0);
  });

  nextDev.on('error', (err) => {
    console.error(`${colors.red}Failed to start dev server: ${err.message}${colors.reset}`);
    process.exit(1);
  });

  nextDev.on('exit', (code) => {
    process.exit(code);
  });
};

// Start the dev server
startDevServer().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
