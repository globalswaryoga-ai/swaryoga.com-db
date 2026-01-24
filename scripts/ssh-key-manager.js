#!/usr/bin/env node

/**
 * SSH Key Manager for WhatsApp Bridge
 * Fast, secure access to SSH keys with auto-discovery
 * 
 * Features:
 * - Auto-locate SSH keys
 * - Cache key info for fast access
 * - Verify key permissions and validity
 * - Support multiple key formats
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

const homeDir = os.homedir();
const projectRoot = process.cwd();
const cacheFile = path.join(projectRoot, '.ssh-key-cache.json');

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Find SSH key locations
 */
function findSSHKeys() {
  const possibleLocations = [
    path.join(homeDir, '.ssh/wa-bridge-key.pem'),
    path.join(homeDir, '.ssh/wa-bridge-key'),
    path.join(projectRoot, 'deploy/wa-bridge/wa-bridge-key.pem'),
    path.join(projectRoot, '.ssh/wa-bridge-key.pem'),
    path.join(projectRoot, 'wa-bridge-key.pem'),
  ];

  const found = [];
  for (const loc of possibleLocations) {
    if (fs.existsSync(loc)) {
      try {
        const stats = fs.statSync(loc);
        if (stats.isFile()) {
          found.push({
            path: loc,
            size: stats.size,
            modified: stats.mtime,
            readable: fs.accessSync(loc, fs.constants.R_OK) === undefined,
          });
        }
      } catch (err) {
        // Ignore inaccessible files
      }
    }
  }

  return found;
}

/**
 * Verify SSH key permissions
 */
function verifyKeyPermissions(keyPath) {
  try {
    const stats = fs.statSync(keyPath);
    const mode = stats.mode & parseInt('777', 8);

    // SSH keys should be 600 (rw-------)
    if (mode !== 0o600) {
      log(`  ⚠️  Key permissions incorrect (${mode.toString(8)})`, 'yellow');
      log(`  Fixing permissions to 600...`, 'yellow');
      fs.chmodSync(keyPath, 0o600);
      log(`  ✅ Permissions fixed to 600`, 'green');
    }

    return true;
  } catch (err) {
    log(`  ❌ Cannot verify permissions: ${err.message}`, 'red');
    return false;
  }
}

/**
 * Get cached key info or discover
 */
function getSSHKeyInfo(force = false) {
  // Try cache first
  if (!force && fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      if (cached.path && fs.existsSync(cached.path)) {
        return cached;
      }
    } catch (err) {
      // Cache invalid, continue discovery
    }
  }

  // Discover keys
  const keys = findSSHKeys();

  if (keys.length === 0) {
    log('\n❌ No SSH keys found!', 'red');
    log('\nExpected locations:', 'yellow');
    log('  • ~/.ssh/wa-bridge-key.pem', 'gray');
    log('  • ~/.ssh/wa-bridge-key', 'gray');
    log('  • ./deploy/wa-bridge/wa-bridge-key.pem', 'gray');
    log('  • ./wa-bridge-key.pem', 'gray');
    return null;
  }

  // Use first available key
  const keyInfo = {
    path: keys[0].path,
    size: keys[0].size,
    modified: keys[0].modified,
    available: keys.length,
  };

  // Verify and cache
  if (verifyKeyPermissions(keyInfo.path)) {
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(keyInfo, null, 2));
    } catch (err) {
      // Cache write failed, but key is still usable
    }
  }

  return keyInfo;
}

/**
 * Test SSH connection to bridge
 */
function testConnection(keyInfo) {
  if (!keyInfo) {
    log('\n❌ No SSH key available for testing', 'red');
    return false;
  }

  try {
    log('\n🔗 Testing SSH connection to EC2...', 'blue');

    const cmd = `ssh -i "${keyInfo.path}" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@52.91.198.23 'echo "✅ SSH connection OK" && uname -a' 2>&1`;
    const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });

    log('  ✅ SSH connection successful!', 'green');
    log(`  Response: ${result.trim().split('\n')[0]}`, 'gray');
    return true;
  } catch (err) {
    log('  ❌ SSH connection failed', 'red');
    log(`  Error: ${err.message.split('\n')[0]}`, 'gray');
    return false;
  }
}

/**
 * Get command to use SSH key
 */
function getSSHCommand(keyInfo, command = '') {
  if (!keyInfo) return null;
  return `ssh -i "${keyInfo.path}" -o StrictHostKeyChecking=no ubuntu@52.91.198.23 '${command}'`;
}

/**
 * Create .ssh config for easy access
 */
function createSSHConfig(keyInfo) {
  if (!keyInfo) return false;

  const sshDir = path.join(homeDir, '.ssh');
  const configFile = path.join(sshDir, 'config');

  try {
    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { mode: 0o700 });
    }

    const configEntry = `
# Swar Yoga Bridge EC2
Host wa-bridge
    HostName 52.91.198.23
    User ubuntu
    IdentityFile ${keyInfo.path}
    StrictHostKeyChecking no
    UserKnownHostsFile=/dev/null
`;

    // Append to config if not already present
    if (!fs.existsSync(configFile)) {
      fs.writeFileSync(configFile, configEntry, { mode: 0o600 });
      log('  ✅ Created SSH config', 'green');
    } else {
      const content = fs.readFileSync(configFile, 'utf-8');
      if (!content.includes('wa-bridge')) {
        fs.appendFileSync(configFile, configEntry);
        log('  ✅ Updated SSH config', 'green');
      }
    }

    return true;
  } catch (err) {
    log(`  ⚠️  Could not update SSH config: ${err.message}`, 'yellow');
    return false;
  }
}

/**
 * Main CLI
 */
function main() {
  const command = process.argv[2];

  switch (command) {
    case 'info':
    case '--info':
    case '-i':
      {
        log('\n🔑 SSH Key Information', 'blue');
        log('═'.repeat(60), 'blue');
        const keyInfo = getSSHKeyInfo();
        if (keyInfo) {
          log(`Location: ${keyInfo.path}`, 'green');
          log(`Size: ${keyInfo.size} bytes`, 'gray');
          log(`Modified: ${new Date(keyInfo.modified).toLocaleString()}`, 'gray');
          log(`Found: ${keyInfo.available} key(s)`, 'gray');
          log('\n✅ SSH key is ready for use', 'green');
        }
      }
      break;

    case 'test':
    case '--test':
    case '-t':
      {
        log('\n🧪 SSH Key Test', 'blue');
        log('═'.repeat(60), 'blue');
        const keyInfo = getSSHKeyInfo();
        testConnection(keyInfo);
      }
      break;

    case 'config':
    case '--config':
    case '-c':
      {
        log('\n⚙️  Setting up SSH config for easy access', 'blue');
        log('═'.repeat(60), 'blue');
        const keyInfo = getSSHKeyInfo();
        if (keyInfo) {
          createSSHConfig(keyInfo);
          log('\nNow you can use: ssh wa-bridge', 'green');
        }
      }
      break;

    case 'cmd':
    case '--cmd':
      {
        // Return SSH command for scripting
        const keyInfo = getSSHKeyInfo();
        const cmd = process.argv[3] || 'pm2 status';
        const sshCmd = getSSHCommand(keyInfo, cmd);
        if (sshCmd) {
          console.log(sshCmd);
        }
      }
      break;

    case 'path':
    case '--path':
      {
        // Return just the key path for scripting
        const keyInfo = getSSHKeyInfo();
        if (keyInfo) {
          console.log(keyInfo.path);
        }
      }
      break;

    default:
      {
        log('\n🔑 SSH Key Manager for WhatsApp Bridge', 'blue');
        log('═'.repeat(60), 'blue');
        log('\nUsage:', 'yellow');
        log('  npm run ssh-key info      - Show key information', 'gray');
        log('  npm run ssh-key test      - Test SSH connection', 'gray');
        log('  npm run ssh-key config    - Setup SSH config', 'gray');
        log('  npm run ssh-key cmd CMD   - Run command on EC2', 'gray');
        log('  npm run ssh-key path      - Output key path', 'gray');

        const keyInfo = getSSHKeyInfo();
        if (keyInfo) {
          log('\n' + '═'.repeat(60), 'blue');
          log('✅ Key Found:', 'green');
          log(`Location: ${keyInfo.path}`, 'gray');
          log(
            `Ready to use with SSH commands (max ${keyInfo.available} key available)`,
            'green'
          );
        } else {
          log('\n' + '═'.repeat(60), 'red');
          log('❌ No SSH key found', 'red');
        }
      }
  }
}

main();
