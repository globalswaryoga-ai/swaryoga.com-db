#!/usr/bin/env node

/**
 * Auto-cleanup system for unwanted files and temporary storage
 * Runs before dev/build to free up disk space automatically
 * 
 * Removes:
 * - Old .next build cache
 * - node_modules cache
 * - Temporary files
 * - Old logs
 * - Docker artifacts
 * - Cache directories
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getSize(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const stats = execSync(`du -sb "${dirPath}" 2>/dev/null || echo 0`, { encoding: 'utf-8' });
    return parseInt(stats.split('\t')[0]) || 0;
  } catch {
    return 0;
  }
}

function deleteFolder(dirPath, name) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const sizeBefore = getSize(dirPath);
    execSync(`rm -rf "${dirPath}"`, { encoding: 'utf-8' });
    log(`  ✅ Removed ${name} (${formatBytes(sizeBefore)})`, 'green');
    return sizeBefore;
  } catch (err) {
    log(`  ⚠️  Failed to remove ${name}: ${err.message}`, 'yellow');
    return 0;
  }
}

function cleanupFolders() {
  const projectRoot = process.cwd();
  let totalFreed = 0;

  log('\n🧹 Auto-Cleanup: Removing Unwanted Files...', 'blue');
  log('═'.repeat(60), 'blue');

  // Define cleanup targets with descriptions
  const cleanupTargets = [
    { path: '.next', name: 'Next.js build cache (.next)' },
    { path: '.turbo', name: 'Turbo cache (.turbo)' },
    { path: 'dist', name: 'Distribution folder (dist)' },
    { path: 'build', name: 'Build folder (build)' },
    { path: '.cache', name: 'Cache folder (.cache)' },
    { path: '.eslintcache', name: 'ESLint cache' },
    { path: 'coverage', name: 'Test coverage (coverage)' },
    { path: '.pytest_cache', name: 'Python test cache (.pytest_cache)' },
    { path: '__pycache__', name: 'Python cache (__pycache__)' },
    { path: 'node_modules/.cache', name: 'Node modules cache' },
  ];

  log('\n📦 Removing build artifacts:', 'yellow');
  for (const target of cleanupTargets) {
    const fullPath = path.join(projectRoot, target.path);
    totalFreed += deleteFolder(fullPath, target.name);
  }

  // Aggressive npm cache cleaning
  log('\n📦 Aggressive package manager cleanup:', 'yellow');
  try {
    execSync('npm cache clean --force 2>/dev/null || true', { encoding: 'utf-8' });
    log('  ✅ NPM cache cleaned', 'green');
  } catch (err) {
    log(`  ⚠️  Failed to clean NPM cache`, 'yellow');
  }

  // Clean yarn cache if present
  try {
    execSync('yarn cache clean 2>/dev/null || true', { encoding: 'utf-8' });
    log('  ✅ Yarn cache cleaned', 'green');
  } catch (err) {
    // Yarn not installed, ignore
  }

  // Remove node_modules if requested (aggressive mode)
  const aggressiveMode = process.argv.includes('--aggressive');
  if (aggressiveMode) {
    log('\n⚠️  AGGRESSIVE MODE: Removing node_modules...', 'yellow');
    totalFreed += deleteFolder(path.join(projectRoot, 'node_modules'), 'node_modules (reinstall with npm install)');
  }

  // Remove old logs
  log('\n📝 Cleaning old logs:', 'yellow');
  const logPatterns = ['*.log', 'npm-debug.log*', 'yarn-error.log*'];
  for (const pattern of logPatterns) {
    try {
      execSync(`find . -maxdepth 3 -name "${pattern}" -delete 2>/dev/null || true`, {
        encoding: 'utf-8',
      });
    } catch (err) {
      // Ignore errors
    }
  }
  log('  ✅ Old log files removed', 'green');

  // Clean temporary files
  log('\n🗑️  Cleaning temporary files:', 'yellow');
  const tempFiles = ['.DS_Store', '*.swp', '*.swo', '*~', '.env.local.swp', '*.tmp', '.vercel'];
  for (const pattern of tempFiles) {
    try {
      execSync(`find . -maxdepth 3 -name "${pattern}" -type f -delete 2>/dev/null || true`, {
        encoding: 'utf-8',
      });
    } catch (err) {
      // Ignore errors
    }
  }
  log('  ✅ Temporary files removed', 'green');

  // Summary
  log('\n' + '═'.repeat(60), 'blue');
  log(`💾 Total space freed: ${formatBytes(totalFreed)}`, 'green');
  
  // Check disk usage and recommend action
  checkDiskUsageAndRecommend();
  
  log('═'.repeat(60), 'blue');

  return totalFreed;
}

function checkDiskUsageAndRecommend() {
  try {
    const output = execSync("df -h . | tail -1 | awk '{print $5}' | sed 's/%//'", { encoding: 'utf-8' }).trim();
    const usagePercent = parseInt(output);
    
    if (usagePercent > 60) {
      log('\n⚠️  WARNING: Disk usage still above 60%!', 'red');
      log('Recommended actions:', 'yellow');
      log('  1. Run aggressive cleanup: npm run cleanup -- --aggressive', 'gray');
      log('  2. This will remove node_modules (reinstall with: npm install)', 'gray');
      log('  3. If EC2: npm run bridge:emergency-cleanup', 'gray');
    } else if (usagePercent > 50) {
      log(`\n💡 Disk usage at ${usagePercent}% (target: 50%)`, 'yellow');
      log('Tip: Run --aggressive flag to free more space', 'gray');
    } else {
      log(`\n✅ Disk usage at ${usagePercent}% (target achieved!)`, 'green');
    }
  } catch (err) {
    // Ignore disk check errors
  }
}

function checkDiskSpace() {
  try {
    const output = execSync("df -h . | tail -1 | awk '{print $4, $5}'", { encoding: 'utf-8' });
    const [available, percent] = output.trim().split(' ');
    log('\n📊 Disk Space Status:', 'blue');
    log(`  Available: ${available}`, 'green');
    log(`  Used: ${percent}`, 'gray');

    const percentNum = parseInt(percent);
    if (percentNum > 75) {
      log('\n🔴 CRITICAL: Disk usage above 75%!', 'red');
      log('Run aggressive cleanup: npm run cleanup -- --aggressive', 'yellow');
    } else if (percentNum > 60) {
      log('\n🟠 WARNING: Disk usage above 60%', 'yellow');
    } else if (percentNum <= 50) {
      log('\n🟢 GOOD: Disk usage at target (≤ 50%)', 'green');
    }
  } catch (err) {
    // Ignore disk space check errors
  }
}

function main() {
  try {
    const startTime = Date.now();
    cleanupFolders();
    checkDiskSpace();
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`\n✅ Cleanup completed in ${duration}s\n`, 'green');
    process.exit(0);
  } catch (err) {
    log(`\n❌ Cleanup failed: ${err.message}\n`, 'red');
    process.exit(1);
  }
}

main();
