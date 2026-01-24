#!/usr/bin/env node

/**
 * Automatic Disk Monitor & Scheduler
 * Monitors disk usage and runs cleanup when needed to maintain 50% target
 * 
 * Usage:
 *   npm run monitor-disk        # Run once
 *   npm run monitor-disk -- --daemon  # Run continuously (background)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

const projectRoot = process.cwd();
const isDaemon = process.argv.includes('--daemon');
const checkInterval = 300000; // 5 minutes
const TARGET_USAGE = 50; // Target disk usage %
const CLEANUP_THRESHOLD = 65; // Run cleanup if usage > 65%

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function getDiskUsage() {
  try {
    const output = execSync("df -h . | tail -1 | awk '{print $5}'", {
      encoding: 'utf-8',
    }).trim();
    return parseInt(output);
  } catch (err) {
    return null;
  }
}

function runCleanup() {
  log('🧹 Running auto-cleanup...', 'blue');
  try {
    execSync('node scripts/auto-cleanup.js', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    return true;
  } catch (err) {
    log('⚠️  Cleanup encountered errors', 'yellow');
    return false;
  }
}

function runAggressiveCleanup() {
  log('🔧 Running aggressive cleanup...', 'yellow');
  try {
    execSync('node scripts/auto-cleanup.js -- --aggressive', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    return true;
  } catch (err) {
    log('⚠️  Aggressive cleanup encountered errors', 'yellow');
    return false;
  }
}

function checkAndClean() {
  const usage = getDiskUsage();

  if (usage === null) {
    log('⚠️  Could not determine disk usage', 'yellow');
    return;
  }

  log(`📊 Disk usage: ${usage}%`, usage > CLEANUP_THRESHOLD ? 'red' : 'gray');

  if (usage > CLEANUP_THRESHOLD) {
    log(`⚠️  Disk usage above threshold (${CLEANUP_THRESHOLD}%)`, 'yellow');

    if (usage > 75) {
      log('🔴 CRITICAL: Running aggressive cleanup', 'red');
      runAggressiveCleanup();
    } else if (usage > 65) {
      log('🟠 Running standard cleanup', 'yellow');
      runCleanup();
    }

    // Check usage after cleanup
    const newUsage = getDiskUsage();
    if (newUsage !== null) {
      log(
        `📊 After cleanup: ${newUsage}% (target: ${TARGET_USAGE}%)`,
        newUsage <= TARGET_USAGE ? 'green' : newUsage <= 60 ? 'yellow' : 'red'
      );
    }
  } else {
    log(`✅ Disk usage at ${usage}% (target: ${TARGET_USAGE}%)`, 'green');
  }
}

function runDaemon() {
  log('🚀 Disk Monitor Daemon Starting', 'blue');
  log(`Target disk usage: ${TARGET_USAGE}%`, 'blue');
  log(`Cleanup threshold: ${CLEANUP_THRESHOLD}%`, 'blue');
  log(`Check interval: ${checkInterval / 1000 / 60} minutes`, 'blue');
  log('Press Ctrl+C to stop', 'gray');
  log('', 'gray');

  // Run check immediately
  checkAndClean();

  // Schedule periodic checks
  setInterval(() => {
    log('', 'gray');
    checkAndClean();
  }, checkInterval);
}

function main() {
  if (isDaemon) {
    runDaemon();
  } else {
    log('📊 Disk Monitor - Single Check', 'blue');
    log('', 'gray');
    checkAndClean();
    log('', 'gray');
    log('💡 To run continuously: npm run monitor-disk -- --daemon', 'gray');
  }
}

main();
