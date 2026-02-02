#!/usr/bin/env node
/**
 * Disk Space Management System
 * Keeps disk usage below 50% with multi-tier cleanup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  TARGET_PERCENT: 50,      // Target: keep below 50%
  WARNING_PERCENT: 40,     // Warning at 40%
  CRITICAL_PERCENT: 45,    // Start cleanup at 45%
  
  // Cleanup tiers (in order of aggressiveness)
  TIERS: {
    LIGHT: 40,      // Light cleanup at 40%
    MEDIUM: 45,     // Medium cleanup at 45%
    AGGRESSIVE: 48, // Aggressive at 48%
    EMERGENCY: 50   // Emergency at 50%
  }
};

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Get current disk usage
function getDiskUsage() {
  try {
    const output = execSync('df -h / | tail -1', { encoding: 'utf8' });
    const parts = output.trim().split(/\s+/);
    const usedPercent = parseInt(parts[4].replace('%', ''));
    const available = parts[3];
    const total = parts[1];
    return { usedPercent, available, total };
  } catch (e) {
    console.error('❌ Failed to get disk usage:', e.message);
    return { usedPercent: 0, available: 'unknown', total: 'unknown' };
  }
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get directory size
function getDirSize(dirPath) {
  try {
    const output = execSync(`du -sk "${dirPath}" 2>/dev/null | cut -f1`, { encoding: 'utf8' });
    return parseInt(output.trim()) * 1024 || 0;
  } catch {
    return 0;
  }
}

// Delete directory safely
function deleteDir(dirPath, dryRun = false) {
  if (!fs.existsSync(dirPath)) return 0;
  const size = getDirSize(dirPath);
  if (dryRun) {
    console.log(`   [DRY RUN] Would delete: ${dirPath} (${formatBytes(size)})`);
  } else {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`   ✅ Deleted: ${dirPath} (${formatBytes(size)})`);
    } catch (e) {
      console.log(`   ⚠️  Failed: ${dirPath} - ${e.message}`);
      return 0;
    }
  }
  return size;
}

// Delete files matching pattern
function deleteFiles(pattern, description, dryRun = false) {
  try {
    const files = execSync(`find ${PROJECT_ROOT} -name "${pattern}" -type f 2>/dev/null`, { encoding: 'utf8' })
      .trim().split('\n').filter(f => f);
    
    let freed = 0;
    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        if (dryRun) {
          console.log(`   [DRY RUN] Would delete: ${file}`);
        } else {
          fs.unlinkSync(file);
        }
        freed += stats.size;
      } catch {}
    }
    if (files.length > 0) {
      console.log(`   ${dryRun ? '[DRY RUN] ' : '✅ '}${description}: ${files.length} files (${formatBytes(freed)})`);
    }
    return freed;
  } catch {
    return 0;
  }
}

// TIER 1: Light Cleanup
function lightCleanup(dryRun = false) {
  console.log('\n🧹 TIER 1: Light Cleanup');
  let freed = 0;

  // Clear npm cache
  if (!dryRun) {
    try {
      execSync('npm cache clean --force 2>/dev/null', { stdio: 'pipe' });
      console.log('   ✅ Cleared npm cache');
    } catch {}
  }

  // Clear .next cache
  freed += deleteDir(path.join(PROJECT_ROOT, '.next/cache'), dryRun);

  // Delete log files
  freed += deleteFiles('*.log', 'Log files', dryRun);
  freed += deleteFiles('npm-debug.log*', 'NPM debug logs', dryRun);

  // Clear temp files
  freed += deleteFiles('*.tmp', 'Temp files', dryRun);
  freed += deleteFiles('.DS_Store', 'DS_Store files', dryRun);

  return freed;
}

// TIER 2: Medium Cleanup
function mediumCleanup(dryRun = false) {
  console.log('\n🧹 TIER 2: Medium Cleanup');
  let freed = lightCleanup(dryRun);

  // Clear entire .next folder
  freed += deleteDir(path.join(PROJECT_ROOT, '.next'), dryRun);

  // Clear TypeScript build info
  freed += deleteFiles('*.tsbuildinfo', 'TS build info', dryRun);

  // Clear coverage reports
  freed += deleteDir(path.join(PROJECT_ROOT, 'coverage'), dryRun);

  // Clear old backup files
  freed += deleteFiles('*.bak', 'Backup files', dryRun);
  freed += deleteFiles('*.old', 'Old files', dryRun);

  // Clear Yarn cache if exists
  if (!dryRun) {
    try {
      execSync('yarn cache clean 2>/dev/null', { stdio: 'pipe' });
      console.log('   ✅ Cleared Yarn cache');
    } catch {}
  }

  return freed;
}

// TIER 3: Aggressive Cleanup
function aggressiveCleanup(dryRun = false) {
  console.log('\n🧹 TIER 3: Aggressive Cleanup');
  let freed = mediumCleanup(dryRun);

  // Remove node_modules (can reinstall)
  const nodeModulesPath = path.join(PROJECT_ROOT, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   ⚠️  Removing node_modules (run npm install to restore)');
    freed += deleteDir(nodeModulesPath, dryRun);
  }

  // Clear global npm cache
  if (!dryRun) {
    try {
      execSync('npm cache clean --force', { stdio: 'pipe' });
    } catch {}
  }

  // Clear brew cache (macOS)
  if (!dryRun && process.platform === 'darwin') {
    try {
      execSync('brew cleanup -s 2>/dev/null', { stdio: 'pipe' });
      console.log('   ✅ Cleared Homebrew cache');
    } catch {}
  }

  return freed;
}

// TIER 4: Emergency Cleanup
function emergencyCleanup(dryRun = false) {
  console.log('\n🚨 TIER 4: EMERGENCY Cleanup');
  let freed = aggressiveCleanup(dryRun);

  // Clear system caches (macOS)
  if (!dryRun && process.platform === 'darwin') {
    const caches = [
      '~/Library/Caches/com.apple.dt.Xcode',
      '~/Library/Caches/CocoaPods',
      '~/Library/Developer/Xcode/DerivedData',
      '~/.gradle/caches',
    ];
    
    for (const cache of caches) {
      const expanded = cache.replace('~', process.env.HOME);
      if (fs.existsSync(expanded)) {
        freed += deleteDir(expanded, dryRun);
      }
    }
  }

  // Clear Docker if available
  if (!dryRun) {
    try {
      execSync('docker system prune -af 2>/dev/null', { stdio: 'pipe' });
      console.log('   ✅ Cleaned Docker');
    } catch {}
  }

  // Empty trash (macOS)
  if (!dryRun && process.platform === 'darwin') {
    try {
      execSync('rm -rf ~/.Trash/* 2>/dev/null', { stdio: 'pipe' });
      console.log('   ✅ Emptied Trash');
    } catch {}
  }

  return freed;
}

// Main cleanup function
function runCleanup(options = {}) {
  const { dryRun = false, force = false, tier = null } = options;
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   💾 DISK SPACE MANAGEMENT SYSTEM');
  console.log('═══════════════════════════════════════════════════════════');
  
  const before = getDiskUsage();
  console.log(`\n📊 Current Disk Status:`);
  console.log(`   Used: ${before.usedPercent}%`);
  console.log(`   Available: ${before.available}`);
  console.log(`   Target: < ${CONFIG.TARGET_PERCENT}%`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No files will be deleted');
  }

  // Determine cleanup tier
  let selectedTier = tier;
  if (!selectedTier) {
    if (before.usedPercent >= CONFIG.TIERS.EMERGENCY) {
      selectedTier = 'emergency';
    } else if (before.usedPercent >= CONFIG.TIERS.AGGRESSIVE) {
      selectedTier = 'aggressive';
    } else if (before.usedPercent >= CONFIG.TIERS.MEDIUM) {
      selectedTier = 'medium';
    } else if (before.usedPercent >= CONFIG.TIERS.LIGHT) {
      selectedTier = 'light';
    } else {
      console.log(`\n✅ Disk usage is healthy (${before.usedPercent}% < ${CONFIG.TIERS.LIGHT}%)`);
      console.log('   No cleanup needed!');
      if (!force) return;
      selectedTier = 'light';
    }
  }

  let freed = 0;
  switch (selectedTier) {
    case 'emergency':
      freed = emergencyCleanup(dryRun);
      break;
    case 'aggressive':
      freed = aggressiveCleanup(dryRun);
      break;
    case 'medium':
      freed = mediumCleanup(dryRun);
      break;
    case 'light':
    default:
      freed = lightCleanup(dryRun);
  }

  const after = getDiskUsage();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   💾 Space freed: ${formatBytes(freed)}`);
  console.log(`   📊 Disk usage: ${before.usedPercent}% → ${after.usedPercent}%`);
  
  if (after.usedPercent < CONFIG.TARGET_PERCENT) {
    console.log(`   ✅ SUCCESS: Below ${CONFIG.TARGET_PERCENT}% target!`);
  } else {
    console.log(`   ⚠️  Still above ${CONFIG.TARGET_PERCENT}%. Consider:`);
    console.log(`      - Run with --tier=aggressive`);
    console.log(`      - Remove unused applications`);
    console.log(`      - Clear browser caches manually`);
  }
  console.log('═══════════════════════════════════════════════════════════');

  // If node_modules was deleted, remind to reinstall
  if (!dryRun && (selectedTier === 'aggressive' || selectedTier === 'emergency')) {
    if (!fs.existsSync(path.join(PROJECT_ROOT, 'node_modules'))) {
      console.log('\n📦 Run `npm install` to restore dependencies');
    }
  }

  return { before, after, freed };
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    force: args.includes('--force') || args.includes('-f'),
    tier: null,
    watch: args.includes('--watch') || args.includes('-w'),
    interval: 60, // minutes
  };

  // Parse tier
  const tierArg = args.find(a => a.startsWith('--tier='));
  if (tierArg) {
    options.tier = tierArg.split('=')[1];
  } else if (args.includes('--light')) options.tier = 'light';
  else if (args.includes('--medium')) options.tier = 'medium';
  else if (args.includes('--aggressive')) options.tier = 'aggressive';
  else if (args.includes('--emergency')) options.tier = 'emergency';

  // Parse interval
  const intervalArg = args.find(a => a.startsWith('--interval='));
  if (intervalArg) {
    options.interval = parseInt(intervalArg.split('=')[1]) || 60;
  }

  return options;
}

// Watch mode - run cleanup periodically
function watchMode(options) {
  console.log(`\n👀 WATCH MODE: Checking every ${options.interval} minutes`);
  console.log(`   Target: < ${CONFIG.TARGET_PERCENT}%`);
  console.log('   Press Ctrl+C to stop\n');

  const check = () => {
    const disk = getDiskUsage();
    const timestamp = new Date().toLocaleTimeString();
    
    if (disk.usedPercent >= CONFIG.TIERS.LIGHT) {
      console.log(`\n[${timestamp}] ⚠️  Disk at ${disk.usedPercent}% - Running cleanup...`);
      runCleanup({ ...options, watch: false });
    } else {
      console.log(`[${timestamp}] ✅ Disk at ${disk.usedPercent}% - Healthy`);
    }
  };

  // Initial check
  check();
  
  // Set interval
  setInterval(check, options.interval * 60 * 1000);
}

// Show help
function showHelp() {
  console.log(`
💾 Disk Space Management System
================================

Usage: node scripts/disk-manager.js [options]

Options:
  --dry-run, -d       Show what would be deleted without deleting
  --force, -f         Run cleanup even if disk is healthy
  --watch, -w         Monitor and auto-cleanup periodically
  --interval=N        Check interval in minutes (default: 60)

Cleanup Tiers:
  --light             Light cleanup (caches, logs)
  --medium            Medium cleanup (build files)
  --aggressive        Aggressive (includes node_modules)
  --emergency         Emergency (system caches, Docker, Trash)
  --tier=TIER         Specify tier by name

Examples:
  node scripts/disk-manager.js                    # Auto-select based on usage
  node scripts/disk-manager.js --dry-run          # Preview only
  node scripts/disk-manager.js --tier=aggressive  # Force aggressive cleanup
  node scripts/disk-manager.js --watch            # Monitor mode

Thresholds:
  < 40%:  No action needed
  40-45%: Light cleanup
  45-48%: Medium cleanup  
  48-50%: Aggressive cleanup
  > 50%:  Emergency cleanup
`);
}

// Main
if (require.main === module) {
  const options = parseArgs();
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (options.watch) {
    watchMode(options);
  } else {
    runCleanup(options);
  }
}

module.exports = { runCleanup, getDiskUsage, CONFIG };
