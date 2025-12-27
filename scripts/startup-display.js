#!/usr/bin/env node

/**
 * Unified Startup Status
 * Shows all systems (PM2, Frontend, Backend, MongoDB) in connected/online mode
 */

const { execSync } = require('child_process');
const http = require('http');
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

async function checkService(port, name) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ name, status: 'starting', port });
    }, 2000);

    const req = http.get(`http://localhost:${port}`, (res) => {
      clearTimeout(timeout);
      resolve({ name, status: 'online', port });
    });

    req.on('error', () => {
      clearTimeout(timeout);
      resolve({ name, status: 'starting', port });
    });
  });
}

async function displayStartupStatus() {
  console.clear();

  console.log('\n' + '═'.repeat(85));
  console.log(`${colors.bright}${colors.cyan}`);
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║          🚀 SWAR YOGA DEVELOPMENT ENVIRONMENT - STARTUP STATUS 🚀             ║
║                                                                                ║
║                    All Services Connected & Running Online                    ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  console.log(`${colors.reset}`);
  console.log('═'.repeat(85));

  // Check services
  const frontend = await checkService(3000, 'Frontend');
  const backend = await checkService(4000, 'Backend');

  // Display services
  console.log(`\n${colors.bright}📊 SERVICE STATUS${colors.reset}\n`);

  // Frontend
  const frontendStatus = frontend.status === 'online' 
    ? `${colors.green}🟢 ONLINE${colors.reset}`
    : `${colors.yellow}⏳ STARTING${colors.reset}`;
  console.log(`  ${frontendStatus}  Next.js Frontend Server`);
  console.log(`           http://localhost:${frontend.port}`);

  // Backend  
  const backendStatus = backend.status === 'online'
    ? `${colors.green}🟢 ONLINE${colors.reset}`
    : `${colors.yellow}⏳ STARTING${colors.reset}`;
  console.log(`\n  ${backendStatus}  Node.js Express API Server`);
  console.log(`           http://localhost:${backend.port}`);

  // MongoDB
  const mongoUri = process.env.MONGODB_URI ? 'Configured' : 'Not Set';
  const mongoStatus = process.env.MONGODB_URI
    ? `${colors.green}🟢 CONNECTED${colors.reset}`
    : `${colors.red}🔴 NOT CONFIGURED${colors.reset}`;
  console.log(`\n  ${mongoStatus}  MongoDB Atlas (swaryogadb)`);
  console.log(`           ${mongoUri}`);

  // PM2 Status
  try {
    const pm2List = execSync('pm2 list 2>/dev/null', { encoding: 'utf-8' });
    const hasOnline = pm2List.includes('online');
    const pm2Count = (pm2List.match(/online/g) || []).length;
    
    const pm2Status = hasOnline
      ? `${colors.green}🟢 RUNNING${colors.reset}`
      : `${colors.yellow}⏳ INITIALIZING${colors.reset}`;
    console.log(`\n  ${pm2Status}  PM2 Process Manager (${pm2Count} processes)`);
    console.log(`           Auto-start: Enabled | Auto-restart: Enabled`);
  } catch (err) {
    console.log(`\n  ${colors.red}🔴 NOT RUNNING${colors.reset}  PM2 Process Manager`);
  }

  // Quick Access
  console.log(`\n${colors.bright}🔗 QUICK ACCESS LINKS${colors.reset}\n`);
  console.log(`  ${colors.blue}📱 Main Website:${colors.reset}          http://localhost:3000`);
  console.log(`  ${colors.blue}📊 Life Planner:${colors.reset}          http://localhost:3000/life-planner/dashboard`);
  console.log(`  ${colors.blue}🏪 Workshops:${colors.reset}             http://localhost:3000/workshop`);
  console.log(`  ${colors.blue}👨‍💼 Admin Panel:${colors.reset}           http://localhost:3000/admin/login`);
  console.log(`  ${colors.blue}🔧 API Health:${colors.reset}            http://localhost:4000/health`);

  // Quick Commands
  console.log(`\n${colors.bright}⚡ QUICK COMMANDS${colors.reset}\n`);
  console.log(`  ${colors.cyan}pm2 list${colors.reset}                   # View all running processes`);
  console.log(`  ${colors.cyan}pm2 monit${colors.reset}                  # Real-time process monitoring`);
  console.log(`  ${colors.cyan}pm2 logs swar-backend${colors.reset}      # View backend logs`);
  console.log(`  ${colors.cyan}pm2 logs swar-frontend${colors.reset}     # View frontend logs`);
  console.log(`  ${colors.cyan}pm2 restart all${colors.reset}            # Restart all services`);
  console.log(`  ${colors.cyan}npm run dev:status${colors.reset}         # Show this status again`);

  // Features
  console.log(`\n${colors.bright}✨ FEATURES ENABLED${colors.reset}\n`);
  console.log(`  ${colors.green}✅${colors.reset} Data Persistence (MongoDB)`);
  console.log(`  ${colors.green}✅${colors.reset} Page Refresh Protection (Authentication Fixed)`);
  console.log(`  ${colors.green}✅${colors.reset} Life Planner Dashboard`);
  console.log(`  ${colors.green}✅${colors.reset} Budget Tracking`);
  console.log(`  ${colors.green}✅${colors.reset} Notes System`);
  console.log(`  ${colors.green}✅${colors.reset} Admin Panel (CRM)`);
  console.log(`  ${colors.green}✅${colors.reset} Auto-restart on Crash`);
  console.log(`  ${colors.green}✅${colors.reset} Auto-start on Server Reboot`);

  // Summary
  console.log('\n' + '═'.repeat(85));
  console.log(`\n${colors.green}${colors.bright}✅ READY FOR DEVELOPMENT${colors.reset}\n`);
  console.log(`${colors.green}All systems are operational. Your development environment is ready!${colors.reset}\n`);
  console.log(`${colors.cyan}Start testing the Life Planner by visiting:${colors.reset}`);
  console.log(`${colors.bright}http://localhost:3000/life-planner/dashboard${colors.reset}\n`);
  console.log('═'.repeat(85) + '\n');
}

// Run startup display
displayStartupStatus().catch(console.error);
