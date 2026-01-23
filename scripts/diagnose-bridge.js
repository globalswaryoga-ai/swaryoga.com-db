#!/usr/bin/env node

/**
 * WhatsApp Bridge Diagnostic & Repair Tool
 * Helps identify and fix issues with the QR bridge on EC2
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const BRIDGE_IP = '52.91.198.23';
const BRIDGE_PORT = 3333;
const EC2_INSTANCE_ID = 'i-0cbb6320079b903d8';
const AWS_REGION = 'us-east-1';
const SSH_KEY_PATH = 'deploy/wa-bridge/wa-bridge-key.pem';

async function log(message) {
  console.log(message);
}

async function success(message) {
  console.log(`${colors.green}✅${colors.reset} ${message}`);
}

async function error(message) {
  console.log(`${colors.red}❌${colors.reset} ${message}`);
}

async function warning(message) {
  console.log(`${colors.yellow}⚠️ ${colors.reset} ${message}`);
}

async function info(message) {
  console.log(`${colors.cyan}ℹ️ ${colors.reset} ${message}`);
}

async function section(title) {
  console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
}

async function checkSSHKey() {
  section('STEP 1: Verify SSH Key');
  
  if (!fs.existsSync(SSH_KEY_PATH)) {
    error(`SSH key not found at: ${SSH_KEY_PATH}`);
    error('Cannot continue without SSH key');
    log('\nTo fix:');
    log('  1. Download wa-bridge-key.pem from AWS EC2 Key Pairs');
    log(`  2. Save to: ${SSH_KEY_PATH}`);
    log('  3. Run: chmod 400 ' + SSH_KEY_PATH);
    log('  4. Run this script again');
    return false;
  }
  
  success(`SSH key found: ${SSH_KEY_PATH}`);
  return true;
}

async function checkAWSConnectivity() {
  section('STEP 2: Check AWS Connectivity');
  
  try {
    const { stdout } = await execAsync(`aws ec2 describe-instances --region ${AWS_REGION} --instance-ids ${EC2_INSTANCE_ID} --query 'Reservations[0].Instances[0].[State.Name,PublicIpAddress]' --output text`);
    const [state, ip] = stdout.trim().split(/\s+/);
    
    if (state === 'running') {
      success(`EC2 instance is RUNNING`);
      info(`Instance: ${EC2_INSTANCE_ID}`);
      info(`IP Address: ${ip}`);
      return true;
    } else {
      error(`EC2 instance is ${state.toUpperCase()}`);
      return false;
    }
  } catch (err) {
    error('Failed to check AWS connectivity');
    error(err.message);
    return false;
  }
}

async function checkBridgeResponse() {
  section('STEP 3: Check Bridge Response');
  
  return new Promise((resolve) => {
    exec(`curl -s -m 5 http://${BRIDGE_IP}:${BRIDGE_PORT}/health 2>&1`, (error, stdout, stderr) => {
      if (error && error.code !== 0) {
        error(`Bridge is not responding at ${BRIDGE_IP}:${BRIDGE_PORT}`);
        info(`Error: ${error.message}`);
        resolve(false);
      } else {
        try {
          const response = JSON.parse(stdout);
          success('Bridge is responding');
          log(`Response: ${JSON.stringify(response, null, 2).split('\n').map(l => '  ' + l).join('\n')}`);
          resolve(true);
        } catch (parseErr) {
          error('Bridge returned invalid JSON');
          info(`Raw response: ${stdout.substring(0, 200)}`);
          resolve(false);
        }
      }
    });
  });
}

async function checkBridgeProcess() {
  section('STEP 4: Check Bridge Process on EC2');
  
  if (!fs.existsSync(SSH_KEY_PATH)) {
    warning('Cannot check process without SSH key');
    return false;
  }
  
  try {
    const { stdout } = await execAsync(`ssh -i ${SSH_KEY_PATH} -o ConnectTimeout=5 ubuntu@${BRIDGE_IP} "docker ps | grep wa-bridge || pm2 status | grep wa-bridge" 2>&1`);
    
    if (stdout.includes('wa-bridge')) {
      success('Bridge process is running');
      log(`\nProcess details:\n${stdout.split('\n').map(l => '  ' + l).join('\n')}`);
      return true;
    } else {
      warning('Bridge process not found');
      return false;
    }
  } catch (err) {
    error('Could not connect to EC2 via SSH');
    info(`Error: ${err.message}`);
    return false;
  }
}

async function restartBridge() {
  section('STEP 5: Restart Bridge Service');
  
  if (!fs.existsSync(SSH_KEY_PATH)) {
    error('Cannot restart without SSH key');
    return false;
  }
  
  try {
    info('Attempting to restart via Docker...');
    const { stdout } = await execAsync(`ssh -i ${SSH_KEY_PATH} ubuntu@${BRIDGE_IP} "docker restart wa-bridge && echo 'Docker restart successful'" 2>&1`);
    
    if (stdout.includes('successful')) {
      success('Bridge restarted successfully');
      return true;
    }
  } catch (err) {
    info('Docker restart failed, trying PM2...');
    
    try {
      const { stdout: pm2Out } = await execAsync(`ssh -i ${SSH_KEY_PATH} ubuntu@${BRIDGE_IP} "pm2 restart wa-bridge && echo 'PM2 restart successful'" 2>&1`);
      
      if (pm2Out.includes('successful')) {
        success('Bridge restarted via PM2');
        return true;
      }
    } catch (pm2Err) {
      error('Both Docker and PM2 restart failed');
      info(`Errors: ${err.message} / ${pm2Err.message}`);
      return false;
    }
  }
}

async function waitForBridgeRecovery() {
  section('STEP 6: Wait for Bridge Recovery');
  
  info('Waiting for bridge to come online...');
  
  const maxAttempts = 12; // 2 minutes with 10-second intervals
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    process.stdout.write(`  Attempt ${attempts}/${maxAttempts}...`);
    
    const isOnline = await new Promise((resolve) => {
      exec(`curl -s -m 5 http://${BRIDGE_IP}:${BRIDGE_PORT}/health 2>&1 | head -c 100`, (error, stdout) => {
        resolve(!error && stdout.includes('status'));
      });
    });
    
    if (isOnline) {
      console.log(' ✅');
      success('Bridge is back online!');
      return true;
    } else {
      console.log(' ⏳');
      await new Promise(r => setTimeout(r, 10000)); // Wait 10 seconds
    }
  }
  
  error('Bridge did not recover within 2 minutes');
  return false;
}

async function verifyBridge() {
  section('STEP 7: Final Verification');
  
  try {
    const { stdout } = await execAsync(`curl -s -m 5 http://${BRIDGE_IP}:${BRIDGE_PORT}/health 2>&1`);
    const response = JSON.parse(stdout);
    
    if (response.status === 'connected') {
      success('Bridge is FULLY OPERATIONAL');
      info(`Status: Connected`);
      info(`Session Ready: ${response.sessionReady ? 'Yes ✓' : 'No - initializing...'}`);
      return true;
    }
  } catch (err) {
    error('Bridge verification failed');
  }
  
  return false;
}

async function main() {
  console.log(`\n${colors.magenta}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║   WhatsApp QR Bridge - Diagnostic & Repair Tool            ║${colors.reset}`);
  console.log(`${colors.magenta}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // Run diagnostics
  const hasKey = await checkSSHKey();
  if (!hasKey) process.exit(1);
  
  const hasAWS = await checkAWSConnectivity();
  if (!hasAWS) {
    error('EC2 instance is not running. Cannot continue.');
    process.exit(1);
  }
  
  const bridgeResponding = await checkBridgeResponse();
  
  if (!bridgeResponding) {
    const processRunning = await checkBridgeProcess();
    
    if (!processRunning) {
      warning('Bridge process is not running');
      warning('Attempting automatic restart...');
      
      const restarted = await restartBridge();
      if (restarted) {
        const recovered = await waitForBridgeRecovery();
        if (recovered) {
          await verifyBridge();
        }
      } else {
        error('Could not automatically restart bridge');
        log('\n📋 Manual steps:');
        log('  1. SSH to EC2: ssh -i ' + SSH_KEY_PATH + ' ubuntu@' + BRIDGE_IP);
        log('  2. Check logs: docker logs wa-bridge | tail -50');
        log('  3. Restart: docker restart wa-bridge');
      }
    }
  } else {
    success('All diagnostics passed! Bridge is operational.');
  }
  
  console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
}

main().catch(err => {
  console.error(`${colors.red}Fatal Error:${colors.reset}`, err.message);
  process.exit(1);
});
