#!/usr/bin/env node

/**
 * QR WHATSAPP FIXES - CRITICAL PATCHES
 *
 * Fixes Applied:
 * 1. ✓ Increase batch size from 10 to 150+ (bulk-150 support)
 * 2. ✓ Add multi-tenant support for 1000+ tenants
 * 3. ✓ Implement proper message status tracking (sent, delivered, read)
 * 4. ✓ Add blue tick tracking (✓ and ✓✓)
 * 5. ✓ Add webhook listener for real-time status updates
 * 6. ✓ Add group scheduling support
 *
 * Usage: node qr-whatsapp-fixes-bulk-150-multitenant.js
 */

const { MongoClient } = require('mongodb');
const http = require('http');
const express = require('express');

// ============================================================================
// CONFIGURATION - FIXED & UPDATED
// ============================================================================

const CONFIG = {
  // WhatsApp Bridge
  BRIDGE_URL: process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333',
  BRIDGE_SECRET: process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI_MAIN,
  MONGODB_CRM_DB: process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',

  // ✓ FIX 1: Batch Settings Updated for bulk-150
  BATCH_SIZE_MAX: parseInt(process.env.BATCH_SIZE_MAX || '150'),
  BATCH_PROCESSING_PARALLEL: 5,
  MESSAGE_DELAY_MS: 500,
  INTERVAL_GAPS: [1000, 2000, 3000],
  OPERATION_LOG_FILE: 'qr-whatsapp-operations.log',

  // ✓ FIX 2: Multi-tenant settings
  TENANT_ID: process.env.TENANT_ID || 'default_tenant',
  ENABLE_MULTI_TENANT: true,

  // ✓ FIX 3: Message status tracking
  ENABLE_BLUE_TICK_TRACKING: true,
  WEBHOOK_LISTENER_PORT: parseInt(process.env.WEBHOOK_LISTENER_PORT || '3334'),
};

// ============================================================================
// FIX 1: BULK-150 BATCH SCHEDULING
// ============================================================================

/**
 * Chunks array into smaller parts for processing
 * Needed for handling 150+ contacts
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Schedule batch messages with bulk-150 support
 * Can handle 1000+ contacts by chunking into 150 batches
 *
 * @param {string[]} phoneNumbers - Array of phone numbers
 * @param {string} message - Message text
 * @param {Object} options - Additional options
 * @returns {Promise<string[]>} Array of batch IDs
 */
async function scheduleBatchMessages(
  phoneNumbers,
  message,
  options = {}
) {
  const {
    delayBetweenMessages = CONFIG.MESSAGE_DELAY_MS,
    groupId = null,
    scheduledTime = null,
    tenantId = CONFIG.TENANT_ID,
    chunkSize = CONFIG.BATCH_SIZE_MAX
  } = options;

  log.header(`Batch Message Scheduling (${phoneNumbers.length} recipients)`);

  // ✓ FIX 1: Handle bulk-150+ by chunking
  if (phoneNumbers.length > chunkSize) {
    log.info(`Splitting ${phoneNumbers.length} contacts into chunks of ${chunkSize}`);
    const chunks = chunkArray(phoneNumbers, chunkSize);
    const batchIds = [];

    for (let i = 0; i < chunks.length; i++) {
      log.info(`Processing chunk ${i + 1}/${chunks.length}...`);
      const ids = await scheduleBatchMessages(chunks[i], message, {
        ...options,
        chunkSize // Pass chunk size to prevent infinite recursion
      });
      batchIds.push(...ids);

      // Wait between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        log.gray(`⏱ Waiting 5s before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return batchIds;
  }

  const db = await getDB();
  const scheduledMessages = db.collection('scheduled_messages');
  const batches = db.collection('message_batches');
  const messages = [];

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Prepare all messages
  for (let i = 0; i < phoneNumbers.length; i++) {
    const phone = phoneNumbers[i].startsWith('91')
      ? phoneNumbers[i]
      : `91${phoneNumbers[i]}`;

    const sendTime = scheduledTime
      ? new Date(scheduledTime.getTime() + delayBetweenMessages * i)
      : new Date(Date.now() + delayBetweenMessages * (i + 1));

    messages.push({
      batchId,
      groupId,
      phoneNumber: phone,
      message,
      status: 'scheduled',
      scheduledTime: sendTime,
      // ✓ FIX 2: Add tenant support
      tenantId,
      // ✓ FIX 3: Add message status fields
      ackLevel: 0, // 0=pending, 1=sent, 2=delivered, 3=read
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      blueTickTime: null,
      waMessageId: null,
      // Standard fields
      createdAt: new Date(),
      attempts: 0,
      lastError: null,
      retryCount: 0,
      metadata: {
        source: 'qr-whatsapp-extension',
        chunkIndex: 0,
        totalChunks: 1
      }
    });

    log.info(`${i + 1}/${phoneNumbers.length}: ${phone} → ${sendTime.toLocaleTimeString()}`);
  }

  try {
    const result = await scheduledMessages.insertMany(messages);

    // Create batch record
    await batches.insertOne({
      _id: batchId,
      tenantId, // ✓ FIX 2: Multi-tenant
      recipients: phoneNumbers.length,
      message,
      groupId,
      status: 'active',
      usageCount: 0,
      isLocked: false,
      maxUses: 1,
      createdAt: new Date(),
      lastUsedAt: null,
      attemptedAt: new Date(),
      metadata: {
        source: 'qr-whatsapp-extension',
        bulkSize: phoneNumbers.length
      }
    });

    log.success(`${result.insertedCount} messages scheduled (Batch ID: ${batchId})`);
    log.info(`📌 Batch: ONE-TIME USE | Size: ${phoneNumbers.length} contacts`);

    // Start async processing
    setTimeout(() => {
      processBatchMessages(batchId);
    }, 2000);

    return [batchId];

  } catch (err) {
    log.error(`Failed to schedule batch: ${err.message}`);
    throw err;
  }
}

/**
 * Process scheduled batch messages with enhanced status tracking
 * Now includes delivery and read tracking
 */
async function processBatchMessages(batchId) {
  const db = await getDB();
  const scheduledMessages = db.collection('scheduled_messages');
  const batches = db.collection('message_batches');

  log.header(`Processing Batch: ${batchId}`);

  // Check if batch exists and is not locked
  const batch = await batches.findOne({ _id: batchId });
  if (!batch) {
    log.error(`Batch ${batchId} not found`);
    return;
  }

  if (batch.isLocked) {
    log.warn(`⛔ Batch is LOCKED (already used).`);
    return;
  }

  let messageCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;

  while (true) {
    try {
      const msg = await scheduledMessages.findOne({
        batchId,
        status: 'scheduled',
        scheduledTime: { $lte: new Date() }
      });

      if (!msg) break;

      log.info(`Sending to ${msg.phoneNumber}...`);

      try {
        const result = await fetchBridge('/send', {
          method: 'POST',
          body: {
            to: msg.phoneNumber,
            message: msg.message,
            type: 'text'
          }
        });

        if (result.status === 200 && result.data?.messageId) {
          // ✓ FIX 3: Track more status fields
          await scheduledMessages.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'sent',
                ackLevel: 1, // Sent
                sentAt: new Date(),
                waMessageId: result.data.messageId, // Store WhatsApp message ID
                metadata: {
                  ...msg.metadata,
                  messageId: result.data.messageId,
                  sentVia: 'bridge'
                }
              }
            }
          );
          log.success(`✓ Message sent to ${msg.phoneNumber}`);
          messageCount++;
        } else {
          await scheduledMessages.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'failed',
                lastError: `HTTP ${result.status}`,
                ackLevel: 0
              },
              $inc: { attempts: 1 }
            }
          );
          log.error(`✗ Failed to send to ${msg.phoneNumber}: HTTP ${result.status}`);
          failedCount++;
        }
      } catch (err) {
        await scheduledMessages.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: 'failed',
              lastError: err.message,
              ackLevel: 0
            },
            $inc: { attempts: 1 }
          }
        );
        log.error(`✗ Error sending to ${msg.phoneNumber}: ${err.message}`);
        failedCount++;
      }

      // Adaptive delay between messages
      const delayIndex = messageCount % CONFIG.INTERVAL_GAPS.length;
      const delay = CONFIG.INTERVAL_GAPS[delayIndex];
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (err) {
      log.error(`Batch processing error: ${err.message}`);
      break;
    }
  }

  // Lock batch after use
  await batches.updateOne(
    { _id: batchId },
    {
      $set: {
        isLocked: true,
        status: 'completed',
        lastUsedAt: new Date()
      },
      $inc: { usageCount: 1 }
    }
  );

  log.success(`✅ Batch ${batchId} completed and LOCKED`);
  log.info(`Summary: ${messageCount} sent | ${failedCount} failed`);
}

// ============================================================================
// FIX 2: MULTI-TENANT SUPPORT
// ============================================================================

/**
 * Get current tenant ID
 */
function getTenantId() {
  return process.env.TENANT_ID || CONFIG.TENANT_ID;
}

/**
 * Create tenant-aware query filter
 */
function withTenantFilter(filter = {}) {
  if (!CONFIG.ENABLE_MULTI_TENANT) return filter;

  return {
    tenantId: getTenantId(),
    ...filter
  };
}

/**
 * Create tenant indexes for optimal performance
 */
async function createTenantIndexes() {
  const db = await getDB();

  log.header('Creating Tenant Indexes for 1000+ Tenant Support');

  try {
    // Message collection indexes
    await db.collection('whatsappmessages').createIndex({
      tenantId: 1,
      direction: 1,
      createdAt: -1
    });
    log.success('Index: whatsappmessages (tenantId, direction, createdAt)');

    await db.collection('whatsappmessages').createIndex({
      tenantId: 1,
      status: 1,
      ackLevel: 1
    });
    log.success('Index: whatsappmessages (tenantId, status, ackLevel)');

    await db.collection('whatsappmessages').createIndex({
      tenantId: 1,
      phoneNumber: 1
    });
    log.success('Index: whatsappmessages (tenantId, phoneNumber)');

    // Scheduled messages indexes
    await db.collection('scheduled_messages').createIndex({
      tenantId: 1,
      status: 1,
      scheduledTime: 1
    });
    log.success('Index: scheduled_messages (tenantId, status, scheduledTime)');

    await db.collection('scheduled_messages').createIndex({
      batchId: 1
    });
    log.success('Index: scheduled_messages (batchId)');

    // Leads indexes
    await db.collection('leads').createIndex({
      tenantId: 1,
      phone: 1
    }, { unique: false });
    log.success('Index: leads (tenantId, phone)');

    // Batches indexes
    await db.collection('message_batches').createIndex({
      tenantId: 1,
      createdAt: -1
    });
    log.success('Index: message_batches (tenantId, createdAt)');

    log.success('✅ All tenant indexes created successfully');

  } catch (err) {
    log.error(`Failed to create indexes: ${err.message}`);
    throw err;
  }
}

/**
 * Query messages for current tenant
 */
async function getTenantMessages(filter = {}, options = {}) {
  const db = await getDB();
  const query = withTenantFilter(filter);

  const cursor = db.collection('whatsappmessages')
    .find(query)
    .sort({ createdAt: -1 });

  if (options.limit) cursor.limit(options.limit);
  return cursor.toArray();
}

// ============================================================================
// FIX 3: MESSAGE STATUS TRACKING WITH BLUE TICKS
// ============================================================================

/**
 * Map WhatsApp ack levels to readable status
 * 0 = pending
 * 1 = sent (single tick ✓)
 * 2 = delivered (double tick ✓✓)
 * 3 = read (blue double tick ✓✓ blue)
 */
function mapAckLevelToStatus(ackLevel) {
  const mapping = {
    0: 'pending',
    1: 'sent',
    2: 'delivered',
    3: 'read'
  };
  return mapping[ackLevel] || 'pending';
}

/**
 * Handle incoming webhook for message status updates
 * Called by WhatsApp bridge when message status changes
 */
async function handleMessageStatusUpdate(update) {
  if (!CONFIG.ENABLE_BLUE_TICK_TRACKING) return;

  const db = await getDB();
  const messages = db.collection('whatsappmessages');

  log.info(`📥 Status Update: ${update.messageId} -> ACK ${update.ackLevel}`);

  try {
    const updateData = {
      $set: {
        status: mapAckLevelToStatus(update.ackLevel),
        ackLevel: update.ackLevel
      }
    };

    // Add timestamp based on ack level
    if (update.ackLevel >= 1) {
      updateData.$set.sentAt = new Date();
    }
    if (update.ackLevel >= 2) {
      updateData.$set.deliveredAt = new Date();
    }
    if (update.ackLevel === 3) {
      updateData.$set.readAt = new Date();
      updateData.$set.blueTickTime = new Date();
    }

    // Update message with new status
    const result = await messages.updateOne(
      { waMessageId: update.messageId },
      updateData
    );

    if (result.matchedCount === 0) {
      log.warn(`Message ${update.messageId} not found in database`);
    } else {
      log.success(`✓✓ Message ${update.messageId} -> ${mapAckLevelToStatus(update.ackLevel)}`);
    }

  } catch (err) {
    log.error(`Failed to update message status: ${err.message}`);
  }
}

// ============================================================================
// FIX 4: GROUP SCHEDULING SUPPORT
// ============================================================================

/**
 * Schedule message to entire WhatsApp group
 */
async function scheduleGroupMessage(groupId, message, options = {}) {
  const db = await getDB();
  const groups = db.collection('whatsappgroups');

  log.header(`Scheduling to Group: ${groupId}`);

  try {
    // Get group and members
    const group = await groups.findOne({
      _id: groupId,
      tenantId: getTenantId() // ✓ Multi-tenant support
    });

    if (!group) {
      throw new Error(`Group ${groupId} not found or not authorized`);
    }

    if (!group.members || group.members.length === 0) {
      throw new Error(`Group ${groupId} has no members`);
    }

    log.info(`Found ${group.members.length} members in group "${group.name}"`);

    // Schedule to all members
    return await scheduleBatchMessages(group.members, message, {
      ...options,
      groupId: groupId,
      tenantId: getTenantId()
    });

  } catch (err) {
    log.error(`Failed to schedule group message: ${err.message}`);
    throw err;
  }
}

/**
 * Get group members for a tenant
 */
async function getTenantGroups(filter = {}) {
  const db = await getDB();
  return db.collection('whatsappgroups')
    .find(withTenantFilter(filter))
    .toArray();
}

// ============================================================================
// FIX 5: WEBHOOK LISTENER FOR REAL-TIME STATUS UPDATES
// ============================================================================

let webhookServer = null;

/**
 * Start webhook listener for real-time message status updates
 * Listens on /webhook/message-status endpoint
 */
function startWebhookListener() {
  if (webhookServer) return; // Already running

  try {
    const app = express();
    app.use(express.json());

    // Webhook endpoint for status updates
    app.post('/webhook/message-status', async (req, res) => {
      try {
        const { messageId, ackLevel, phoneNumber, timestamp } = req.body;

        if (!messageId || ackLevel === undefined) {
          return res.status(400).json({ error: 'Missing messageId or ackLevel' });
        }

        // Handle status update
        await handleMessageStatusUpdate({
          messageId,
          ackLevel: parseInt(ackLevel),
          phoneNumber,
          timestamp: new Date(timestamp)
        });

        res.json({ success: true, message: 'Status updated' });

      } catch (err) {
        log.error(`Webhook error: ${err.message}`);
        res.status(500).json({ error: err.message });
      }
    });

    // Health check
    app.get('/webhook/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });

    webhookServer = app.listen(CONFIG.WEBHOOK_LISTENER_PORT, () => {
      log.success(`Webhook listener started on port ${CONFIG.WEBHOOK_LISTENER_PORT}`);
      log.info(`POST /webhook/message-status - Status updates`);
      log.info(`GET  /webhook/health - Health check`);
    });

  } catch (err) {
    log.error(`Failed to start webhook listener: ${err.message}`);
  }
}

// ============================================================================
// UTILITY FUNCTIONS (Not shown - use from original file)
// ============================================================================

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

let mongoClient = null;

async function connectMongo() {
  if (mongoClient && mongoClient.topology?.isConnected()) {
    return mongoClient;
  }
  mongoClient = new MongoClient(CONFIG.MONGODB_URI);
  await mongoClient.connect();
  log.success(`Connected to MongoDB`);
  return mongoClient;
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

async function fetchBridge(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.BRIDGE_URL + path);
    const protocol = url.protocol === 'https:' ? require('https') : http;

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

// ============================================================================
// MAIN - INITIALIZE ALL FIXES
// ============================================================================

async function initializeAllFixes() {
  log.header('QR WhatsApp Fixes - Initializing');

  try {
    await connectMongo();

    // Create all necessary indexes
    await createTenantIndexes();

    // Start webhook listener for status updates
    startWebhookListener();

    log.success('✅ All fixes initialized successfully');
    log.info(`Bulk-150: ${CONFIG.BATCH_SIZE_MAX} max contacts per batch`);
    log.info(`Multi-tenant: Enabled (Tenant: ${getTenantId()})`);
    log.info(`Blue tick tracking: ${CONFIG.ENABLE_BLUE_TICK_TRACKING ? 'Enabled' : 'Disabled'}`);
    log.info(`Webhook listener: http://localhost:${CONFIG.WEBHOOK_LISTENER_PORT}`);

  } catch (err) {
    log.error(`Initialization failed: ${err.message}`);
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = {
  scheduleBatchMessages,
  processBatchMessages,
  scheduleGroupMessage,
  getTenantMessages,
  getTenantGroups,
  createTenantIndexes,
  startWebhookListener,
  handleMessageStatusUpdate,
  getTenantId,
  withTenantFilter,
  initializeAllFixes,
  CONFIG
};

// Run if called directly
if (require.main === module) {
  initializeAllFixes().then(() => {
    log.info('Ready for operations. Use in interactive menu or import module.');
  }).catch(err => {
    log.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
