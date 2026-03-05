#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    QR WHATSAPP PC EXTENSION v1.0                         ║
 * ║                                                                          ║
 * ║  Unified management for:                                                ║
 * ║  ✓ QR Code Scanning & Connection                                        ║
 * ║  ✓ Funnel Management (Lead stages)                                      ║
 * ║  ✓ Label Management (Contact tagging)                                   ║
 * ║  ✓ Batch Scheduling (Messages to 10 people)                             ║
 * ║                                                                          ║
 * ║  Usage: node qr-whatsapp-pc-extension.js [command] [options]            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

require('dotenv').config({ path: '.env.local' });

const http = require('http');
const https = require('https');
const readline = require('readline');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// ============════════════════════════════════════════════════════════════════
// CONFIGURATION
// ============════════════════════════════════════════════════════════════════

const CONFIG = {
  // WhatsApp Bridge
  BRIDGE_URL: process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333',
  BRIDGE_SECRET: process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI_MAIN || 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB',
  MONGODB_CRM_DB: process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',

  // Batch Settings
  BATCH_SIZE: 10,
  MESSAGE_DELAY_MS: 1000, // Delay between each message (legacy)
  INTERVAL_GAPS: [3000, 6000], // Alternating delays: 3s, then 6s (repeats)
  OPERATION_LOG_FILE: 'qr-whatsapp-operations.log',
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const log = {
  header: (msg) => console.log(`\n${colors.cyan}${colors.bright}═══ ${msg} ═══${colors.reset}\n`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  gray: (msg) => console.log(`${colors.gray}${msg}${colors.reset}`),
};

// ============════════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ============════════════════════════════════════════════════════════════════

let mongoClient = null;

async function connectMongo() {
  if (mongoClient && mongoClient.topology?.isConnected()) {
    return mongoClient;
  }

  try {
    mongoClient = new MongoClient(CONFIG.MONGODB_URI);
    await mongoClient.connect();
    log.success(`Connected to MongoDB (Main DB)`);
    return mongoClient;
  } catch (err) {
    log.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

async function getDB() {
  const client = await connectMongo();
  return client.db(CONFIG.MONGODB_CRM_DB);
}

async function disconnectMongo() {
  if (mongoClient) {
    await mongoClient.close();
    log.success('MongoDB disconnected');
  }
}

// ============════════════════════════════════════════════════════════════════
// LOGGING UTILITIES
// ============════════════════════════════════════════════════════════════════

function writeLog(action, details) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action}: ${JSON.stringify(details)}\n`;
  fs.appendFileSync(path.join(__dirname, CONFIG.OPERATION_LOG_FILE), logEntry);
}

// ============════════════════════════════════════════════════════════════════
// QR BRIDGE OPERATIONS
// ============════════════════════════════════════════════════════════════════

async function fetchBridge(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.BRIDGE_URL + path);
    const protocol = url.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'x-bridge-secret': CONFIG.BRIDGE_SECRET,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 8000,
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            error: 'JSON parse error',
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Bridge request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function getQRCode() {
  log.header('QR Code');
  try {
    const result = await fetchBridge('/qr');
    if (result.status === 200) {
      log.success('QR code retrieved');
      log.info(`QR Data Length: ${result.data?.length || 0} bytes`);
      if (result.data && typeof result.data === 'string') {
        const shortQR = result.data.substring(0, 100) + '...';
        log.gray(`Data: ${shortQR}`);
      }
      writeLog('GET_QR', { status: result.status });
      return result.data;
    } else {
      log.error(`Failed to get QR: HTTP ${result.status}`);
      writeLog('GET_QR_FAILED', { status: result.status, data: result.data });
    }
  } catch (err) {
    log.error(`Error fetching QR: ${err.message}`);
    writeLog('GET_QR_ERROR', { error: err.message });
  }
}

async function getBridgeStatus() {
  try {
    const result = await fetchBridge('/status');
    return result.data;
  } catch (err) {
    log.error(`Bridge status check failed: ${err.message}`);
    return null;
  }
}

async function checkBridgeConnection() {
  log.header('Bridge Connection Status');
  try {
    const status = await getBridgeStatus();
    if (status) {
      log.success(`Bridge is connected`);
      log.info(`Phone: ${status.phone || 'Not available'}`);
      log.info(`Battery: ${status.battery || 'Unknown'}%`);
      log.info(`IsConnected: ${status.isConnected ? 'Yes' : 'No'}`);
      return true;
    } else {
      log.error('Bridge not responding');
      return false;
    }
  } catch (err) {
    log.error(`Connection check failed: ${err.message}`);
    return false;
  }
}

// ============════════════════════════════════════════════════════════════════
// FUNNEL MANAGEMENT
// ============════════════════════════════════════════════════════════════════

const FUNNEL_STAGES = [
  'lead',
  'interested',
  'qualified',
  'in-progress',
  'converted',
  'cold',
];

async function createFunnel() {
  log.header('Create Funnel');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `${colors.cyan}Enter funnel name (e.g., "Yoga Program Q1"):${colors.reset} `,
      async (name) => {
        rl.close();
        const db = await getDB();
        const funnels = db.collection('funnels');

        const funnel = {
          _id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          stages: FUNNEL_STAGES,
          createdAt: new Date(),
          leadCount: 0,
        };

        try {
          await funnels.insertOne(funnel);
          log.success(`Funnel created: ${name}`);
          log.info(`Stages: ${FUNNEL_STAGES.join(' → ')}`);
          writeLog('CREATE_FUNNEL', { name, stages: FUNNEL_STAGES });
        } catch (err) {
          log.error(`Failed to create funnel: ${err.message}`);
        }

        resolve();
      }
    );
  });
}

async function listFunnels() {
  log.header('Available Funnels');
  const db = await getDB();
  const funnels = db.collection('funnels');

  try {
    const list = await funnels.find({}).toArray();
    if (list.length === 0) {
      log.warn('No funnels found');
    } else {
      list.forEach((f, i) => {
        console.log(`${i + 1}. ${colors.bright}${f.name}${colors.reset} (${f.leadCount} leads)`);
        console.log(`   Stages: ${f.stages.join(' → ')}`);
      });
    }
  } catch (err) {
    log.error(`Failed to list funnels: ${err.message}`);
  }
}

async function moveLead(phoneNumber, funnelName, stage) {
  const db = await getDB();
  const leads = db.collection('leads');

  while (!/^[0-9]{10,15}$/.test(phoneNumber)) {
    log.error('Invalid phone format');
    return;
  }

  try {
    const normalizedPhone = phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber}`;

    const result = await leads.updateOne(
      { phoneNumber: normalizedPhone },
      {
        $set: {
          funnel: funnelName,
          funnelStage: stage,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    log.success(`Lead ${normalizedPhone} moved to ${funnelName}/${stage}`);
    writeLog('MOVE_LEAD', { phoneNumber: normalizedPhone, funnel: funnelName, stage });
  } catch (err) {
    log.error(`Failed to move lead: ${err.message}`);
  }
}

// ============════════════════════════════════════════════════════════════════
// LABEL MANAGEMENT
// ============════════════════════════════════════════════════════════════════

async function applyLabel(phoneNumber, labelName) {
  log.header('Apply Label');
  const db = await getDB();
  const leads = db.collection('leads');

  const normalizedPhone = phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber}`;

  try {
    await leads.updateOne(
      { phoneNumber: normalizedPhone },
      {
        $addToSet: { labels: labelName },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    log.success(`Label "${labelName}" applied to ${normalizedPhone}`);
    writeLog('APPLY_LABEL', { phoneNumber: normalizedPhone, label: labelName });
  } catch (err) {
    log.error(`Failed to apply label: ${err.message}`);
  }
}

async function removeLabel(phoneNumber, labelName) {
  const db = await getDB();
  const leads = db.collection('leads');

  const normalizedPhone = phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber}`;

  try {
    await leads.updateOne(
      { phoneNumber: normalizedPhone },
      {
        $pull: { labels: labelName },
        $set: { updatedAt: new Date() },
      }
    );

    log.success(`Label "${labelName}" removed from ${normalizedPhone}`);
    writeLog('REMOVE_LABEL', { phoneNumber: normalizedPhone, label: labelName });
  } catch (err) {
    log.error(`Failed to remove label: ${err.message}`);
  }
}

async function findByLabel(labelName) {
  log.header(`Leads with Label: "${labelName}"`);
  const db = await getDB();
  const leads = db.collection('leads');

  try {
    const results = await leads.find({ labels: labelName }).limit(100).toArray();
    if (results.length === 0) {
      log.warn(`No leads found with label "${labelName}"`);
    } else {
      log.success(`Found ${results.length} leads`);
      results.forEach((lead, i) => {
        console.log(
          `${i + 1}. ${lead.phoneNumber.substring(lead.phoneNumber.length - 4)} (${lead.name || 'Unknown'})`
        );
        if (lead.labels && lead.labels.length > 0) {
          console.log(`   Labels: ${lead.labels.join(', ')}`);
        }
      });
    }
  } catch (err) {
    log.error(`Failed to find leads: ${err.message}`);
  }
}

// ============════════════════════════════════════════════════════════════════
// BATCH MESSAGE SCHEDULING (10 people limit)
// ============════════════════════════════════════════════════════════════════

async function scheduleBatchMessages(
  phoneNumbers,
  message,
  delayBetweenMessages = CONFIG.MESSAGE_DELAY_MS
) {
  log.header(`Batch Message Scheduling (${phoneNumbers.length} recipients)`);

  if (phoneNumbers.length > CONFIG.BATCH_SIZE) {
    log.warn(
      `Only processing first ${CONFIG.BATCH_SIZE} recipients (limit: ${CONFIG.BATCH_SIZE})`
    );
    phoneNumbers = phoneNumbers.slice(0, CONFIG.BATCH_SIZE);
  }

  const db = await getDB();
  const scheduledMessages = db.collection('scheduled_messages');
  const batches = db.collection('message_batches');
  const messages = [];

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  for (let i = 0; i < phoneNumbers.length; i++) {
    const phone = phoneNumbers[i].startsWith('91') ? phoneNumbers[i] : `91${phoneNumbers[i]}`;
    const sendTime = new Date(Date.now() + delayBetweenMessages * (i + 1));

    messages.push({
      batchId,
      phoneNumber: phone,
      message,
      status: 'scheduled',
      scheduledTime: sendTime,
      createdAt: new Date(),
      attempts: 0,
      lastError: null,
    });

    log.info(`${i + 1}/${phoneNumbers.length}: ${phone} → ${sendTime.toLocaleTimeString()}`);
  }

  try {
    const result = await scheduledMessages.insertMany(messages);
    
    // Create batch record with lock tracking
    await batches.insertOne({
      _id: batchId,
      recipients: phoneNumbers.length,
      message,
      status: 'active',
      usageCount: 0,
      isLocked: false,
      maxUses: 1,
      createdAt: new Date(),
      lastUsedAt: null,
      attemptedAt: new Date(),
    });

    log.success(`${result.insertedCount} messages scheduled (Batch ID: ${batchId})`);
    log.info(`📌 Batch Lock: ONE-TIME USE (can create new batches to use again)`);
    writeLog('SCHEDULE_BATCH', {
      batchId,
      count: result.insertedCount,
      recipients: phoneNumbers,
      locked: false,
    });

    // Start processing
    setTimeout(() => {
      processBatchMessages(batchId);
    }, 2000);
  } catch (err) {
    log.error(`Failed to schedule batch: ${err.message}`);
  }
}

async function processBatchMessages(batchId) {
  const db = await getDB();
  const scheduledMessages = db.collection('scheduled_messages');
  const batches = db.collection('message_batches');

  log.header(`Processing Batch: ${batchId}`);

  // Check if batch is locked
  const batch = await batches.findOne({ _id: batchId });
  if (batch && batch.isLocked) {
    log.warn(`⛔ Batch is LOCKED (already used). Create a new batch to send again.`);
    return;
  }

  let messageCount = 0;
  while (true) {
    try {
      const msg = await scheduledMessages.findOne({
        batchId,
        status: 'scheduled',
        scheduledTime: { $lte: new Date() },
      });

      if (!msg) {
        break;
      }

      log.info(`Sending to ${msg.phoneNumber}...`);

      try {
        const result = await fetchBridge('/send', {
          method: 'POST',
          body: {
            to: msg.phoneNumber,
            message: msg.message,
            type: 'text',
          },
        });

        if (result.status === 200) {
          await scheduledMessages.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'sent',
                sentTime: new Date(),
              },
            }
          );
          log.success(`Message sent to ${msg.phoneNumber}`);
          messageCount++;
        } else {
          await scheduledMessages.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'failed',
                lastError: `HTTP ${result.status}`,
              },
              $inc: { attempts: 1 },
            }
          );
          log.error(`Failed to send to ${msg.phoneNumber}: HTTP ${result.status}`);
        }
      } catch (err) {
        await scheduledMessages.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: 'failed',
              lastError: err.message,
            },
            $inc: { attempts: 1 },
          }
        );
        log.error(`Error sending to ${msg.phoneNumber}: ${err.message}`);
      }

      // Delay before next message (alternating: 3s, 6s, 3s, 6s...)
      const delayIndex = messageCount % CONFIG.INTERVAL_GAPS.length;
      const delay = CONFIG.INTERVAL_GAPS[delayIndex];
      log.gray(`  ⏱ Waiting ${delay / 1000}s before next message...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (err) {
      log.error(`Batch processing error: ${err.message}`);
      break;
    }
  }

  // LOCK THE BATCH AFTER USE
  await batches.updateOne(
    { _id: batchId },
    {
      $set: {
        isLocked: true,
        status: 'completed',
        lastUsedAt: new Date(),
      },
      $inc: { usageCount: 1 },
    }
  );

  log.success(`✅ Batch ${batchId} LOCKED (one-time use completed)`);
  log.info(`${messageCount} messages sent successfully`);
  log.warn(`📌 To send similar messages again, CREATE A NEW BATCH`);
}

async function listScheduledBatches() {
  log.header('Scheduled Message Batches');
  const db = await getDB();
  const scheduledMessages = db.collection('scheduled_messages');

  try {
    const batches = await scheduledMessages
      .aggregate([
        {
          $group: {
            _id: '$batchId',
            count: { $sum: 1 },
            statuses: { $push: '$status' },
            createdAt: { $first: '$createdAt' },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    if (batches.length === 0) {
      log.warn('No batches found');
    } else {
      batches.forEach((b, i) => {
        const sent = b.statuses.filter((s) => s === 'sent').length;
        const pending = b.statuses.filter((s) => s === 'scheduled').length;
        const failed = b.statuses.filter((s) => s === 'failed').length;

        console.log(
          `${i + 1}. Batch ${colors.bright}${b._id}${colors.reset}`
        );
        console.log(
          `   Total: ${b.count} | Sent: ${sent} | Pending: ${pending} | Failed: ${failed}`
        );
        console.log(`   Created: ${new Date(b.createdAt).toLocaleString()}`);
      });
    }
  } catch (err) {
    log.error(`Failed to list batches: ${err.message}`);
  }
}

// ============════════════════════════════════════════════════════════════════
// INTERACTIVE MENU
// ============════════════════════════════════════════════════════════════════

function showMenu() {
  console.log(`
${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}${colors.bright}║          QR WHATSAPP PC EXTENSION - MAIN MENU           ║${colors.reset}
${colors.cyan}${colors.bright}╚════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}🔌 BRIDGE OPERATIONS:${colors.reset}
  1. Check Bridge Status
  2. Get QR Code

${colors.bright}📊 FUNNEL MANAGEMENT:${colors.reset}
  3. Create Funnel
  4. List Funnels
  5. Move Lead to Stage

${colors.bright}🏷️  LABEL MANAGEMENT:${colors.reset}
  6. Apply Label to Contact
  7. Remove Label
  8. Find Contacts by Label

${colors.bright}📨 BATCH MESSAGING:${colors.reset}
  9. Schedule Batch Messages (10 people)
  10. View Scheduled Batches

${colors.bright}⚙️  UTILITIES:${colors.reset}
  11. View Operation Log
  0. Exit

${colors.yellow}Select option (0-11):${colors.reset} `);
}

async function runInteractiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) =>
    new Promise((resolve) => rl.question(query, resolve));

  await connectMongo();

  while (true) {
    showMenu();
    const choice = (await question('')).trim();

    switch (choice) {
      case '1':
        await checkBridgeConnection();
        break;

      case '2':
        await getQRCode();
        break;

      case '3':
        await createFunnel();
        break;

      case '4':
        await listFunnels();
        break;

      case '5': {
        const phone = await question(`${colors.cyan}Phone number:${colors.reset} `);
        const funnel = await question(`${colors.cyan}Funnel name:${colors.reset} `);
        const stage = await question(
          `${colors.cyan}Stage (${FUNNEL_STAGES.join('|')}):${colors.reset} `
        );
        await moveLead(phone, funnel, stage);
        break;
      }

      case '6': {
        const phone = await question(`${colors.cyan}Phone number:${colors.reset} `);
        const label = await question(`${colors.cyan}Label name:${colors.reset} `);
        await applyLabel(phone, label);
        break;
      }

      case '7': {
        const phone = await question(`${colors.cyan}Phone number:${colors.reset} `);
        const label = await question(`${colors.cyan}Label to remove:${colors.reset} `);
        await removeLabel(phone, label);
        break;
      }

      case '8': {
        const label = await question(`${colors.cyan}Label name:${colors.reset} `);
        await findByLabel(label);
        break;
      }

      case '9': {
        const phonesInput = await question(
          `${colors.cyan}Phone numbers (comma-separated, max 10):${colors.reset} `
        );
        const phones = phonesInput.split(',').map((p) => p.trim()).slice(0, 10);
        const msg = await question(`${colors.cyan}Message text:${colors.reset} `);
        await scheduleBatchMessages(phones, msg);
        break;
      }

      case '10':
        await listScheduledBatches();
        break;

      case '11': {
        if (fs.existsSync(CONFIG.OPERATION_LOG_FILE)) {
          const log = fs.readFileSync(CONFIG.OPERATION_LOG_FILE, 'utf-8');
          console.log(`\n${colors.gray}${log}${colors.reset}`);
        } else {
          console.log('No operations logged yet.');
        }
        break;
      }

      case '0':
        log.success('Goodbye!');
        rl.close();
        await disconnectMongo();
        process.exit(0);

      default:
        log.error('Invalid option');
    }

    console.log('');
    await question(`${colors.gray}Press Enter to continue...${colors.reset}`);
    console.clear();
  }
}

// ============════════════════════════════════════════════════════════════════
// COMMAND-LINE INTERFACE
// ============════════════════════════════════════════════════════════════════

async function runCLI() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.clear();
    await runInteractiveMenu();
    return;
  }

  const command = args[0];

  await connectMongo();

  switch (command) {
    case 'status':
      await checkBridgeConnection();
      break;

    case 'qr':
      await getQRCode();
      break;

    case 'funnel:create':
      await createFunnel();
      break;

    case 'funnel:list':
      await listFunnels();
      break;

    case 'label:apply':
      if (args.length < 3) {
        log.error('Usage: label:apply <phone> <labelName>');
      } else {
        await applyLabel(args[1], args[2]);
      }
      break;

    case 'label:remove':
      if (args.length < 3) {
        log.error('Usage: label:remove <phone> <labelName>');
      } else {
        await removeLabel(args[1], args[2]);
      }
      break;

    case 'label:find':
      if (args.length < 2) {
        log.error('Usage: label:find <labelName>');
      } else {
        await findByLabel(args[1]);
      }
      break;

    case 'batch:schedule':
      if (args.length < 3) {
        log.error('Usage: batch:schedule <phones_csv> <message>');
      } else {
        const phones = args[1].split(',').map((p) => p.trim()).slice(0, 10);
        const msg = args.slice(2).join(' ');
        await scheduleBatchMessages(phones, msg);
      }
      break;

    case 'batch:list':
      await listScheduledBatches();
      break;

    default:
      log.error(`Unknown command: ${command}`);
      console.log(`
Available commands:
  - status               Check bridge connection
  - qr                   Get QR code
  - funnel:create        Create new funnel
  - funnel:list          List all funnels
  - label:apply <phone> <label>  Apply label
  - label:remove <phone> <label> Remove label
  - label:find <label>   Find contacts by label
  - batch:schedule <phones> <message>  Schedule batch messages
  - batch:list           View scheduled batches

Or run without arguments for interactive menu.
      `);
  }

  await disconnectMongo();
}

// ============════════════════════════════════════════════════════════════════
// STARTUP
// ============════════════════════════════════════════════════════════════════

runCLI().catch((err) => {
  log.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
