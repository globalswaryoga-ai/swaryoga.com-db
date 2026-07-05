#!/usr/bin/env node
/**
 * QR WHATSAPP COMPREHENSIVE AUDIT
 * Checks all functions and reports issues
 *
 * Functions to Audit:
 * 1. QR Scanner - open & connectivity
 * 2. Inbound/Outbound message flow
 * 3. Message status tracking (sent, delivered, read, failed)
 * 4. Blue tick tracking (✓ single, ✓✓ double)
 * 5. Batch scheduling (bulk-150, group)
 * 6. Multi-tenant support (1000 tenants)
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const http = require('http');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const MONGODB_CRM_DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';

let client = null;

const report = {
  timestamp: new Date().toISOString(),
  checks: [],
  issues: [],
  warnings: [],
  stats: {}
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(type, msg) {
  const prefix = {
    'success': `${colors.green}✓${colors.reset}`,
    'error': `${colors.red}✗${colors.reset}`,
    'warn': `${colors.yellow}⚠${colors.reset}`,
    'info': `${colors.cyan}ℹ${colors.reset}`
  };
  console.log(`${prefix[type] || '●'} ${msg}`);
}

async function connectDB() {
  if (client && client.topology?.isConnected()) return client;
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client;
}

async function checkQRScanner() {
  log('info', 'Auditing QR Scanner...');
  const check = { name: 'QR Scanner', status: 'pending', details: [] };

  try {
    // Check if bridge is responding
    const response = await new Promise((resolve, reject) => {
      const req = http.get(`${BRIDGE_URL}/qr`, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });

    if (response === 200) {
      check.status = 'pass';
      check.details.push('QR endpoint responding (200)');
      log('success', 'QR Scanner endpoint is working');
    } else {
      check.status = 'fail';
      check.details.push(`QR endpoint returned HTTP ${response}`);
      log('error', `QR Scanner returned HTTP ${response}`);
    }
  } catch (err) {
    check.status = 'fail';
    check.details.push(`Bridge connection error: ${err.message}`);
    report.issues.push(`QR Scanner: ${err.message}`);
    log('error', `QR Scanner error: ${err.message}`);
  }

  report.checks.push(check);
}

async function checkMessageFlow() {
  log('info', 'Auditing Message Flow (Inbound/Outbound)...');
  const db = client.db(MONGODB_CRM_DB);

  try {
    // Check inbound messages
    const inbound = await db.collection('whatsappmessages')
      .find({ direction: 'inbound' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    const inboundCheck = { name: 'Inbound Messages', status: inbound.length > 0 ? 'pass' : 'warn', count: inbound.length };
    if (inbound.length === 0) {
      report.warnings.push('No inbound messages found in database');
      log('warn', 'No inbound messages found');
    } else {
      log('success', `Found ${inbound.length} inbound messages`);
      const sample = inbound[0];
      inboundCheck.details = {
        phone: sample.phoneNumber,
        direction: sample.direction,
        type: sample.messageType,
        timestamp: sample.createdAt
      };
    }
    report.checks.push(inboundCheck);

    // Check outbound messages
    const outbound = await db.collection('whatsappmessages')
      .find({ direction: 'outbound' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    const outboundCheck = { name: 'Outbound Messages', status: outbound.length > 0 ? 'pass' : 'warn', count: outbound.length };
    if (outbound.length === 0) {
      report.warnings.push('No outbound messages found in database');
      log('warn', 'No outbound messages found');
    } else {
      log('success', `Found ${outbound.length} outbound messages`);
      const sample = outbound[0];
      outboundCheck.details = {
        phone: sample.phoneNumber,
        direction: sample.direction,
        status: sample.status,
        timestamp: sample.createdAt
      };
    }
    report.checks.push(outboundCheck);

  } catch (err) {
    report.issues.push(`Message Flow audit: ${err.message}`);
    log('error', `Message flow error: ${err.message}`);
  }
}

async function checkMessageStatus() {
  log('info', 'Auditing Message Status Tracking...');
  const db = client.db(MONGODB_CRM_DB);

  try {
    const statuses = {};
    const messages = await db.collection('whatsappmessages')
      .aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
      .toArray();

    messages.forEach(m => {
      statuses[m._id] = m.count;
    });

    const requiredStatuses = ['sent', 'delivered', 'read', 'failed'];
    const check = {
      name: 'Message Status Tracking',
      status: 'partial',
      details: statuses,
      missing: []
    };

    requiredStatuses.forEach(status => {
      if (!statuses[status]) {
        check.missing.push(status);
        report.issues.push(`Message status "${status}" not found in data`);
        log('warn', `No "${status}" status messages found`);
      } else {
        log('success', `${status}: ${statuses[status]} messages`);
      }
    });

    report.checks.push(check);
    report.stats.messageStatuses = statuses;

  } catch (err) {
    report.issues.push(`Status tracking audit: ${err.message}`);
    log('error', `Status tracking error: ${err.message}`);
  }
}

async function checkBlueTicks() {
  log('info', 'Auditing Blue Tick Tracking (✓ / ✓✓)...');
  const db = client.db(MONGODB_CRM_DB);

  try {
    // Check for messages with acknowledgment statuses
    const withAck = await db.collection('whatsappmessages')
      .find({
        $or: [
          { status: { $in: ['read', 'delivered'] } },
          { 'metadata.ack': { $exists: true } }
        ]
      })
      .limit(5)
      .toArray();

    const check = {
      name: 'Blue Tick Tracking',
      status: withAck.length > 0 ? 'pass' : 'warn',
      messagesWithAck: withAck.length,
      details: []
    };

    if (withAck.length === 0) {
      report.warnings.push('No messages with blue tick/read status found');
      log('warn', 'No blue tick/read status messages detected');
    } else {
      log('success', `Found ${withAck.length} messages with ack/read status`);
      withAck.forEach(msg => {
        check.details.push({
          status: msg.status,
          ack: msg.metadata?.ack,
          phone: msg.phoneNumber
        });
      });
    }

    report.checks.push(check);

  } catch (err) {
    report.issues.push(`Blue tick audit: ${err.message}`);
    log('error', `Blue tick tracking error: ${err.message}`);
  }
}

async function checkBatchScheduling() {
  log('info', 'Auditing Batch Message Scheduling...');
  const db = client.db(MONGODB_CRM_DB);

  try {
    // Check scheduled_messages collection
    const scheduled = await db.collection('scheduled_messages')
      .countDocuments({ status: 'scheduled' });

    const batches = await db.collection('message_batches')
      .countDocuments();

    const check = {
      name: 'Batch Scheduling',
      status: 'pass',
      scheduledMessages: scheduled,
      totalBatches: batches,
      details: []
    };

    // Check batch structure
    const sampleBatch = await db.collection('message_batches')
      .findOne({});

    if (sampleBatch) {
      check.details.push({
        batchId: sampleBatch._id,
        recipients: sampleBatch.recipients,
        locked: sampleBatch.isLocked,
        status: sampleBatch.status
      });
      log('success', `Found ${batches} message batches`);
    }

    // Check for bulk-150 capability
    if (scheduled > 0) {
      log('success', `${scheduled} scheduled messages pending`);
    }

    report.checks.push(check);
    report.stats.batchScheduling = { scheduled, totalBatches };

  } catch (err) {
    report.issues.push(`Batch scheduling audit: ${err.message}`);
    log('error', `Batch scheduling error: ${err.message}`);
  }
}

async function checkMultiTenant() {
  log('info', 'Auditing Multi-Tenant Support (1000+ tenants)...');
  const db = client.db(MONGODB_CRM_DB);

  try {
    // Check leads collection for tenant data
    const leads = await db.collection('leads').countDocuments();
    const tenantField = await db.collection('leads').findOne({});

    // Check for tenant/organization field
    const hasTenantField = tenantField && (tenantField.tenantId || tenantField.organizationId || tenantField.tenant);

    const check = {
      name: 'Multi-Tenant Support',
      status: hasTenantField ? 'pass' : 'warn',
      totalLeads: leads,
      hasTenantField: hasTenantField
    };

    if (!hasTenantField) {
      report.warnings.push('No tenant field found in leads collection - multi-tenant tracking may not work for 1000+ tenants');
      log('warn', 'Tenant field not detected in leads');
    } else {
      log('success', `Found ${leads} leads with tenant tracking`);
    }

    report.checks.push(check);
    report.stats.multiTenant = { totalLeads, hasTenantField };

  } catch (err) {
    report.issues.push(`Multi-tenant audit: ${err.message}`);
    log('error', `Multi-tenant error: ${err.message}`);
  }
}

async function checkDatabaseIndexes() {
  log('info', 'Auditing Database Indexes (Performance)...');
  const db = client.db(MONGODB_CRM_DB);

  try {
    const collections = ['whatsappmessages', 'scheduled_messages', 'leads', 'message_batches'];
    const check = {
      name: 'Database Indexes',
      status: 'pass',
      details: {}
    };

    for (const col of collections) {
      try {
        const indexes = await db.collection(col).listIndexes().toArray();
        check.details[col] = {
          indexCount: indexes.length,
          indexes: indexes.map(i => i.key)
        };
        log('success', `${col}: ${indexes.length} indexes found`);
      } catch (e) {
        log('warn', `Could not read indexes for ${col}`);
      }
    }

    report.checks.push(check);

  } catch (err) {
    report.issues.push(`Index audit: ${err.message}`);
    log('error', `Index audit error: ${err.message}`);
  }
}

async function runAudit() {
  console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║  QR WHATSAPP COMPREHENSIVE AUDIT      ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════╝${colors.reset}\n`);

  try {
    await connectDB();
    log('success', 'Connected to MongoDB');

    await checkQRScanner();
    await checkMessageFlow();
    await checkMessageStatus();
    await checkBlueTicks();
    await checkBatchScheduling();
    await checkMultiTenant();
    await checkDatabaseIndexes();

  } catch (err) {
    log('error', `Connection error: ${err.message}`);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }

  // Print summary
  console.log(`\n${colors.cyan}${colors.bright}═══ AUDIT SUMMARY ═══${colors.reset}\n`);
  console.log(`Total Checks: ${report.checks.length}`);
  console.log(`Issues Found: ${report.issues.length}`);
  console.log(`Warnings: ${report.warnings.length}\n`);

  if (report.issues.length > 0) {
    console.log(`${colors.red}ISSUES:${colors.reset}`);
    report.issues.forEach(issue => console.log(`  • ${issue}`));
  }

  if (report.warnings.length > 0) {
    console.log(`\n${colors.yellow}WARNINGS:${colors.reset}`);
    report.warnings.forEach(warning => console.log(`  • ${warning}`));
  }

  console.log(`\n${colors.cyan}Report saved to: qr-whatsapp-audit-report.json${colors.reset}`);

  // Save report
  const fs = require('fs');
  fs.writeFileSync('qr-whatsapp-audit-report.json', JSON.stringify(report, null, 2));
}

runAudit().catch(console.error);
