#!/usr/bin/env node

/**
 * EC2 Status Checker
 * Displays AWS EC2 instance status on startup
 * Requires AWS credentials configured
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
};

const formatStatus = (status) => {
  switch (status.toLowerCase()) {
    case 'running':
      return `${colors.green}✅ RUNNING${colors.reset}`;
    case 'stopped':
      return `${colors.yellow}⏸️  STOPPED${colors.reset}`;
    case 'stopping':
      return `${colors.yellow}🛑 STOPPING${colors.reset}`;
    case 'pending':
      return `${colors.yellow}⏳ PENDING${colors.reset}`;
    case 'terminated':
      return `${colors.red}❌ TERMINATED${colors.reset}`;
    default:
      return `${colors.gray}? ${status}${colors.reset}`;
  }
};

const getEC2Status = async () => {
  try {
    // Try to get EC2 instances with swar-yoga name tag first
    let { stdout } = await execAsync(
      `aws ec2 describe-instances --filters "Name=tag:Name,Values=swar-yoga*" --query "Reservations[*].Instances[*].[Tags[?Key=='Name']|[0].Value,State.Name,InstanceType,PublicIpAddress]" --output text 2>/dev/null || echo ""`,
      { timeout: 5000 }
    );

    // If no swar-yoga instances found, get all running instances
    if (!stdout.trim()) {
      const result = await execAsync(
        `aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].[Tags[?Key=='Name']|[0].Value,State.Name,InstanceType,PublicIpAddress]" --output text 2>/dev/null || echo ""`,
        { timeout: 5000 }
      );
      stdout = result.stdout;
    }

    if (!stdout.trim()) {
      return null;
    }

    const instances = stdout.trim().split('\n').filter(line => line.trim());
    return instances;
  } catch (error) {
    // AWS CLI not configured or not available
    return null;
  }
};

const checkServiceStatus = async () => {
  try {
    const http = require('http');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: 3333,
        path: '/',
        method: 'GET',
        timeout: 2000,
      };

      const req = http.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          console.log(`  ${colors.bright}Service (Port 3333):${colors.reset} ${colors.green}✅ RESPONDING${colors.reset}`);
        } else {
          console.log(`  ${colors.bright}Service (Port 3333):${colors.reset} ${colors.yellow}⚠️  ERROR (${res.statusCode})${colors.reset}`);
        }
        resolve();
      });

      req.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
          console.log(`  ${colors.bright}Service (Port 3333):${colors.reset} ${colors.yellow}⏸️  NOT RESPONDING${colors.reset}`);
        } else {
          console.log(`  ${colors.bright}Service (Port 3333):${colors.reset} ${colors.gray}? UNKNOWN${colors.reset}`);
        }
        resolve();
      });

      req.on('timeout', () => {
        console.log(`  ${colors.bright}Service (Port 3333):${colors.reset} ${colors.yellow}⏱️  TIMEOUT${colors.reset}`);
        req.destroy();
        resolve();
      });

      req.end();
    });
  } catch (error) {
    // Silently handle any errors
  }
};

const displayStatus = async () => {
  console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}🌐 AWS EC2 STATUS${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);

  try {
    const instances = await getEC2Status();

    if (!instances || instances.length === 0) {
      console.log(`${colors.yellow}⚠️  AWS CLI not configured or no EC2 instances found${colors.reset}`);
      console.log(`${colors.gray}To enable EC2 status monitoring:${colors.reset}`);
      console.log(`  1. Configure AWS CLI: ${colors.blue}aws configure${colors.reset}`);
      console.log(`  2. Set AWS_REGION and credentials in .env.local\n`);
      return;
    }

    let hasRunning = false;
    let hasStopped = false;

    instances.forEach((instance) => {
      const [name, state, type, ip] = instance.split(/\s+/);
      
      if (state.toLowerCase() === 'running') {
        hasRunning = true;
      } else {
        hasStopped = true;
      }

      console.log(`  ${colors.bright}Instance:${colors.reset} ${name}`);
      console.log(`  ${colors.bright}Status:${colors.reset} ${formatStatus(state)}`);
      console.log(`  ${colors.bright}Type:${colors.reset} ${type}`);
      if (ip && ip !== 'None') {
        console.log(`  ${colors.bright}IP Address:${colors.reset} ${colors.cyan}${ip}${colors.reset}`);
        console.log(`  ${colors.bright}Service Port:${colors.reset} 3333`);
      }
      console.log('');
    });

    // Check if service on port 3333 is responding
    await checkServiceStatus();

    if (hasRunning && !hasStopped) {
      console.log(`${colors.green}✅ All EC2 instances are running and ready${colors.reset}\n`);
    } else if (hasStopped) {
      console.log(`${colors.yellow}⚠️  Some EC2 instances are not running${colors.reset}\n`);
    }
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      console.log(`${colors.yellow}⏱️  AWS EC2 status check timed out${colors.reset}\n`);
    } else {
      // Silently fail if AWS is not configured
      console.log(`${colors.gray}📌 AWS EC2 status unavailable (AWS CLI not configured)${colors.reset}\n`);
    }
  }

  console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);
};

// Run if called directly
if (require.main === module) {
  displayStatus().catch(console.error);
}

module.exports = { displayStatus, getEC2Status, checkServiceStatus };
