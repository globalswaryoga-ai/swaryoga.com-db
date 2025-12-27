#!/usr/bin/env node

/**
 * Startup Status Display
 * Shows all services (Frontend, Backend, MongoDB, PM2) connected and running
 * Runs at dev server startup
 */

const http = require('http');
const { execSync } = require('child_process');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const symbols = {
  success: '✅',
  error: '❌',
  loading: '⏳',
  info: 'ℹ️',
  online: '🟢',
  offline: '🔴',
  server: '🖥️',
  database: '🗄️',
  process: '⚙️',
  rocket: '🚀',
};

let statusData = {
  frontend: { status: 'checking', port: 3000 },
  backend: { status: 'checking', port: 4000 },
  mongodb: { status: 'checking' },
  pm2: { status: 'checking' },
};

async function checkFrontend() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      statusData.frontend.status = 'starting';
      resolve();
    }, 2000);

    const req = http.get('http://localhost:3000', (res) => {
      clearTimeout(timeout);
      if (res.statusCode === 200 || res.statusCode === 404) {
        statusData.frontend.status = 'online';
      } else {
        statusData.frontend.status = 'error';
      }
      resolve();
    });

    req.on('error', () => {
      clearTimeout(timeout);
      statusData.frontend.status = 'starting';
      resolve();
    });
  });
}

async function checkBackend() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      statusData.backend.status = 'starting';
      resolve();
    }, 2000);

    const req = http.get('http://localhost:4000/health', (res) => {
      clearTimeout(timeout);
      if (res.statusCode === 200) {
        statusData.backend.status = 'online';
      } else {
        statusData.backend.status = 'error';
      }
      resolve();
    });

    req.on('error', () => {
      clearTimeout(timeout);
      statusData.backend.status = 'starting';
      resolve();
    });
  });
}

async function checkMongoDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      statusData.mongodb.status = 'error';
      statusData.mongodb.message = 'MONGODB_URI not configured';
      return;
    }

    const mongoose = require('mongoose');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000,
    });

    statusData.mongodb.status = 'online';
    statusData.mongodb.message = 'Connected to MongoDB Atlas';
    await mongoose.disconnect();
  } catch (err) {
    statusData.mongodb.status = 'error';
    statusData.mongodb.message = err.message.split('\n')[0];
  }
}

function checkPM2() {
  try {
    const pm2Status = execSync('pm2 list --json', { encoding: 'utf-8' });
    const processes = JSON.parse(pm2Status);
    
    const runningProcesses = processes.filter(p => p.pm2_env.status === 'online');
    
    if (runningProcesses.length > 0) {
      statusData.pm2.status = 'online';
      statusData.pm2.processes = runningProcesses.map(p => ({
        name: p.name,
        status: p.pm2_env.status,
        memory: `${(p.monit?.memory / 1024 / 1024).toFixed(1)}mb`,
      }));
    } else {
      statusData.pm2.status = 'offline';
      statusData.pm2.message = 'No processes running';
    }
  } catch (err) {
    statusData.pm2.status = 'offline';
    statusData.pm2.message = 'PM2 not started';
  }
}

async function displayStatus() {
  // Wait a bit for servers to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check all services
  await Promise.all([
    checkFrontend(),
    checkBackend(),
    checkMongoDB(),
  ]);
  
  checkPM2();

  // Display header
  console.log('\n' + '═'.repeat(75));
  console.log(`${colors.bright}${colors.cyan}              🚀 SWAR YOGA DEVELOPMENT SERVER STARTUP 🚀${colors.reset}\n`);
  console.log('═'.repeat(75));

  // Frontend Status
  console.log(`\n${symbols.server} FRONTEND SERVER`);
  console.log(`   ${getStatusIcon(statusData.frontend.status)} http://localhost:${statusData.frontend.port}`);
  console.log(`   Technology: ${colors.blue}Next.js 14${colors.reset}`);
  console.log(`   Status: ${getStatusBadge(statusData.frontend.status)}`);

  // Backend Status
  console.log(`\n${symbols.server} BACKEND SERVER`);
  console.log(`   ${getStatusIcon(statusData.backend.status)} http://localhost:${statusData.backend.port}`);
  console.log(`   Technology: ${colors.blue}Node.js + Express${colors.reset}`);
  console.log(`   Status: ${getStatusBadge(statusData.backend.status)}`);

  // MongoDB Status
  console.log(`\n${symbols.database} DATABASE`);
  console.log(`   ${getStatusIcon(statusData.mongodb.status)} MongoDB Atlas`);
  console.log(`   Message: ${statusData.mongodb.message || 'Connected'}`);
  console.log(`   Status: ${getStatusBadge(statusData.mongodb.status)}`);

  // PM2 Status
  console.log(`\n${symbols.process} PROCESS MANAGER (PM2)`);
  if (statusData.pm2.processes && statusData.pm2.processes.length > 0) {
    statusData.pm2.processes.forEach(proc => {
      console.log(`   ${getStatusIcon(proc.status)} ${proc.name} (${proc.memory})`);
    });
  } else {
    console.log(`   ${getStatusIcon(statusData.pm2.status)} ${statusData.pm2.message || 'Status unknown'}`);
  }
  console.log(`   Status: ${getStatusBadge(statusData.pm2.status)}`);

  // Overall Status
  console.log('\n' + '─'.repeat(75));
  const allOnline = 
    statusData.frontend.status === 'online' &&
    statusData.backend.status === 'online' &&
    statusData.mongodb.status === 'online' &&
    (statusData.pm2.status === 'online' || statusData.pm2.status === 'offline');

  if (allOnline) {
    console.log(`\n${colors.green}${colors.bright}✅ ALL SYSTEMS OPERATIONAL${colors.reset}`);
    console.log(`${colors.green}Ready for development!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  SOME SERVICES STARTING${colors.reset}`);
    console.log(`${colors.yellow}Check status in a moment...${colors.reset}\n`);
  }

  console.log('═'.repeat(75) + '\n');

  // Quick Links
  console.log(`${colors.bright}Quick Links:${colors.reset}`);
  console.log(`  📱 Frontend:        http://localhost:3000`);
  console.log(`  🔧 API:             http://localhost:4000/health`);
  console.log(`  📊 Life Planner:    http://localhost:3000/life-planner/dashboard`);
  console.log(`  👨‍💼 Admin Panel:      http://localhost:3000/admin`);
  console.log(`  📡 PM2 Monitor:     pm2 monit`);
  console.log(`  📋 PM2 Status:      pm2 list\n`);
}

// Run status check
displayStatus().catch(console.error);

function getStatusIcon(status) {
  const icons = {
    online: `${colors.green}${symbols.online}${colors.reset}`,
    starting: `${colors.yellow}${symbols.loading}${colors.reset}`,
    offline: `${colors.red}${symbols.offline}${colors.reset}`,
    error: `${colors.red}${symbols.error}${colors.reset}`,
    checking: `${colors.yellow}${symbols.loading}${colors.reset}`,
  };
  return icons[status] || symbols.info;
}

function getStatusBadge(status) {
  const badges = {
    online: `${colors.green}${colors.bright}ONLINE${colors.reset}`,
    starting: `${colors.yellow}${colors.bright}STARTING${colors.reset}`,
    offline: `${colors.red}${colors.bright}OFFLINE${colors.reset}`,
    error: `${colors.red}${colors.bright}ERROR${colors.reset}`,
    checking: `${colors.yellow}${colors.bright}CHECKING${colors.reset}`,
  };
  return badges[status] || 'UNKNOWN';
}
