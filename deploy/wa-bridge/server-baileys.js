const express = require("express");
const qrcode = require("qrcode");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage
} = require("baileys");

const app = express();
const PORT = 3333;
const BRIDGE_SECRET = "swar-bridge-secret-2024";
const AUTH_DIR = "/tmp/.baileys_auth";
const DATA_DIR = "/tmp/.baileys_data";

// CRM Webhook URL to forward incoming messages
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || "https://crm.swaryoga.com/api/admin/crm/whatsapp/qr/webhook";

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], credentials: true, allowedHeaders: ["Content-Type", "x-bridge-secret"] }));
app.use(express.json({ limit: "50mb" }));

const authMiddleware = (req, res, next) => {
  if (req.headers["x-bridge-secret"] !== BRIDGE_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
};

let sock = null;
let qrCode = null;
let sessionReady = false;

// ============ BROADCAST SETTINGS ============
let broadcastSettings = {
  delayBetweenMessages: 5000,      // 5 seconds default
  gapAfterMessages: 10,            // Pause after every 10 messages
  gapPauseDuration: 30000,         // 30 seconds pause
  allowedStartHour: 7,             // 7 AM
  allowedEndHour: 21,              // 9 PM
  enabled: true
};

// ============ MESSAGE TRACKING ============
// Structure: { messageId: { phone, status, timestamp, error } }
let messageTracking = {};
let blockedNumbers = new Set();
let scheduledBroadcasts = [];

// ============ LID TO PHONE MAPPING ============
// Maps WhatsApp LID (internal ID) to real phone numbers
// LIDs look like: 1606351380725@lid
// This is populated by contacts.upsert and contacts.update events
let lidToPhoneMap = {};
let phoneToLidMap = {};

// Helper to resolve LID to phone number
function resolvePhoneFromLid(lid) {
  // Remove @lid suffix if present
  const cleanLid = lid.replace("@lid", "");
  // Check cache
  if (lidToPhoneMap[cleanLid]) {
    return lidToPhoneMap[cleanLid];
  }
  return null;
}

// Helper to update LID mapping
function updateLidMapping(lid, phone) {
  if (!lid || !phone) return;
  const cleanLid = lid.replace("@lid", "").replace("@s.whatsapp.net", "").replace("@c.us", "");
  const cleanPhone = phone.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
  
  // Only store if phone looks valid (10+ digits)
  if (cleanPhone.length >= 10 && cleanPhone.length <= 15) {
    lidToPhoneMap[cleanLid] = cleanPhone;
    phoneToLidMap[cleanPhone] = cleanLid;
    console.log(`📇 Updated LID mapping: ${cleanLid} -> ${cleanPhone}`);
  }
}

// Load saved data
function loadData() {
  try {
    const settingsFile = path.join(DATA_DIR, "settings.json");
    const trackingFile = path.join(DATA_DIR, "tracking.json");
    const blockedFile = path.join(DATA_DIR, "blocked.json");
    const scheduledFile = path.join(DATA_DIR, "scheduled.json");
    const lidMapFile = path.join(DATA_DIR, "lid-map.json");
    
    if (fs.existsSync(settingsFile)) broadcastSettings = JSON.parse(fs.readFileSync(settingsFile));
    if (fs.existsSync(trackingFile)) messageTracking = JSON.parse(fs.readFileSync(trackingFile));
    if (fs.existsSync(blockedFile)) blockedNumbers = new Set(JSON.parse(fs.readFileSync(blockedFile)));
    if (fs.existsSync(scheduledFile)) scheduledBroadcasts = JSON.parse(fs.readFileSync(scheduledFile));
    if (fs.existsSync(lidMapFile)) {
      const lidData = JSON.parse(fs.readFileSync(lidMapFile));
      lidToPhoneMap = lidData.lidToPhone || {};
      phoneToLidMap = lidData.phoneToLid || {};
      console.log(`📇 Loaded ${Object.keys(lidToPhoneMap).length} LID mappings`);
    }
    console.log("Data loaded successfully");
  } catch (e) { console.error("Load data error:", e.message); }
}

function saveData() {
  try {
    fs.writeFileSync(path.join(DATA_DIR, "settings.json"), JSON.stringify(broadcastSettings, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, "tracking.json"), JSON.stringify(messageTracking, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, "blocked.json"), JSON.stringify([...blockedNumbers]));
    fs.writeFileSync(path.join(DATA_DIR, "scheduled.json"), JSON.stringify(scheduledBroadcasts, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, "lid-map.json"), JSON.stringify({ lidToPhone: lidToPhoneMap, phoneToLid: phoneToLidMap }, null, 2));
  } catch (e) { console.error("Save data error:", e.message); }
}

// Check if current time is within allowed broadcast hours
function isWithinAllowedHours() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= broadcastSettings.allowedStartHour && hour < broadcastSettings.allowedEndHour;
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logger = pino({ level: "warn" });

async function initializeClient() {
  console.log("Initializing Baileys WhatsApp client...");
  loadData();
  
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    generateHighQualityLinkPreview: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR code received!");
      try {
        qrCode = await qrcode.toDataURL(qr);
        console.log("QR ready for scanning");
      } catch (e) {
        console.error("QR generation error:", e);
      }
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("Connection closed, reason:", reason);
      sessionReady = false;
      qrCode = null;

      if (reason !== DisconnectReason.loggedOut) {
        console.log("Reconnecting...");
        setTimeout(initializeClient, 5000);
      } else {
        console.log("Logged out, clearing session...");
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        setTimeout(initializeClient, 3000);
      }
    } else if (connection === "open") {
      console.log("WhatsApp CONNECTED!");
      sessionReady = true;
      qrCode = null;
    }
  });

  // Track contacts for LID to phone mapping
  sock.ev.on("contacts.upsert", (contacts) => {
    console.log(`📇 Received ${contacts.length} contacts`);
    for (const contact of contacts) {
      // contact.id could be phone@s.whatsapp.net or lid@lid
      // contact.lid has the LID
      // contact.notify or contact.name has the name
      if (contact.id && contact.lid) {
        // Map LID to phone
        const phone = contact.id.replace("@s.whatsapp.net", "").replace("@c.us", "");
        const lid = contact.lid.replace("@lid", "");
        updateLidMapping(lid, phone);
      } else if (contact.id && contact.id.includes("@s.whatsapp.net")) {
        // Regular phone, might have phone as both id and lid
        const phone = contact.id.replace("@s.whatsapp.net", "");
        if (contact.lid) {
          updateLidMapping(contact.lid, phone);
        }
      }
    }
    saveData();
  });

  // Also track contacts.update for any mappings
  sock.ev.on("contacts.update", (updates) => {
    for (const update of updates) {
      if (update.id && update.id.includes("@s.whatsapp.net")) {
        const phone = update.id.replace("@s.whatsapp.net", "");
        // If there's a lid field, update the mapping
        if (update.lid) {
          updateLidMapping(update.lid, phone);
        }
      }
    }
  });

  // Track message updates (delivered, read) and forward to CRM
  sock.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      const msgId = update.key?.id;
      const statusCode = update.update?.status;
      let newStatus = null;
      
      // Baileys status codes: 2=delivered, 3=read, 4=played (for voice notes)
      if (statusCode === 2) {
        newStatus = "delivered";
      } else if (statusCode === 3 || statusCode === 4) {
        newStatus = "read";
      }
      
      if (msgId && newStatus) {
        // Update local tracking if we have it
        if (messageTracking[msgId]) {
          messageTracking[msgId].status = newStatus;
          if (newStatus === "delivered") {
            messageTracking[msgId].deliveredAt = Date.now();
          } else if (newStatus === "read") {
            messageTracking[msgId].readAt = Date.now();
          }
          saveData();
        }
        
        // Forward status update to CRM webhook
        try {
          const statusPayload = {
            type: "status_update",
            messageId: msgId,
            status: newStatus,
            timestamp: Date.now(),
            remoteJid: update.key?.remoteJid,
          };
          
          const res = await fetch(`${CRM_WEBHOOK_URL}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-bridge-secret": BRIDGE_SECRET,
            },
            body: JSON.stringify(statusPayload),
          });
          
          if (res.ok) {
            console.log(`📬 Status update forwarded to CRM: ${msgId} -> ${newStatus}`);
          } else {
            console.log(`⚠️ CRM status webhook returned ${res.status}`);
          }
        } catch (err) {
          console.error("❌ Failed to forward status to CRM:", err.message);
        }
      }
    }
  });

  // Handle incoming messages - forward to CRM webhook
  sock.ev.on("messages.upsert", async (m) => {
    if (!m.messages || m.messages.length === 0) return;
    
    for (const msg of m.messages) {
      // Skip outgoing messages (from us)
      if (msg.key.fromMe) {
        console.log("⬆️ Outgoing message (skipped):", msg.key.id);
        continue;
      }
      
      const remoteJid = msg.key.remoteJid || "";
      const pushName = msg.pushName || "";
      
      // Log raw message for debugging
      console.log("📨 RAW incoming:", JSON.stringify({
        remoteJid,
        participant: msg.key.participant,
        pushName,
        messageKeys: Object.keys(msg.message || {})
      }));
      
      // Skip group messages (@g.us) - only skip groups, process @lid
      if (remoteJid.includes("@g.us")) {
        console.log("⚠️ Skipping group message from:", remoteJid);
        continue;
      }
      
      // For @lid format, try to resolve to real phone number
      let phone = "";
      let originalLid = ""; // Keep track of original LID for logging
      
      if (remoteJid.includes("@lid")) {
        originalLid = remoteJid.replace("@lid", "");
        
        // First check if there's a participant with real phone
        if (msg.key.participant && !msg.key.participant.includes("@lid")) {
          phone = msg.key.participant.replace("@s.whatsapp.net", "").replace("@c.us", "");
          console.log(`📇 @lid message resolved via participant: ${originalLid} -> ${phone}`);
          // Update our mapping for future messages
          updateLidMapping(originalLid, phone);
          saveData();
        } else {
          // Try to resolve from our LID cache
          const resolvedPhone = resolvePhoneFromLid(originalLid);
          if (resolvedPhone) {
            phone = resolvedPhone;
            console.log(`📇 @lid message resolved via cache: ${originalLid} -> ${phone}`);
          } else {
            // Can't resolve - skip this message as we don't have a valid phone
            console.log(`⚠️ @lid message cannot be resolved, skipping: ${originalLid}`);
            console.log(`   Current LID cache has ${Object.keys(lidToPhoneMap).length} entries`);
            continue;
          }
        }
      } else {
        phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
      }
      
      console.log("📨 Processing incoming from:", phone, "name:", pushName);
      
      // Extract message content
      let messageContent = "";
      let messageType = "text";
      let mediaUrl = null;
      let mediaBuffer = null;
      
      if (msg.message?.conversation) {
        messageContent = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        messageContent = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage) {
        messageType = "image";
        messageContent = msg.message.imageMessage.caption || "[Image]";
        // Download media
        try {
          mediaBuffer = await downloadMediaMessage(msg, 'buffer', {});
          console.log("📷 Downloaded image, size:", mediaBuffer?.length);
        } catch (dlErr) {
          console.log("⚠️ Could not download image:", dlErr.message);
        }
      } else if (msg.message?.videoMessage) {
        messageType = "video";
        messageContent = msg.message.videoMessage.caption || "[Video]";
        try {
          mediaBuffer = await downloadMediaMessage(msg, 'buffer', {});
          console.log("🎬 Downloaded video, size:", mediaBuffer?.length);
        } catch (dlErr) {
          console.log("⚠️ Could not download video:", dlErr.message);
        }
      } else if (msg.message?.audioMessage) {
        messageType = "audio";
        messageContent = "[Audio]";
        try {
          mediaBuffer = await downloadMediaMessage(msg, 'buffer', {});
          console.log("🎵 Downloaded audio, size:", mediaBuffer?.length);
        } catch (dlErr) {
          console.log("⚠️ Could not download audio:", dlErr.message);
        }
      } else if (msg.message?.documentMessage) {
        messageType = "document";
        messageContent = msg.message.documentMessage.fileName || "[Document]";
        try {
          mediaBuffer = await downloadMediaMessage(msg, 'buffer', {});
          console.log("📄 Downloaded document, size:", mediaBuffer?.length);
        } catch (dlErr) {
          console.log("⚠️ Could not download document:", dlErr.message);
        }
      } else if (msg.message?.stickerMessage) {
        messageType = "sticker";
        messageContent = "[Sticker]";
      } else if (msg.message?.buttonsResponseMessage) {
        messageContent = msg.message.buttonsResponseMessage.selectedDisplayText || msg.message.buttonsResponseMessage.selectedButtonId;
      } else if (msg.message?.listResponseMessage) {
        messageContent = msg.message.listResponseMessage.title || msg.message.listResponseMessage.singleSelectReply?.selectedRowId;
      }
      
      if (!messageContent && !mediaBuffer) continue;
      
      console.log(`📥 Incoming from ${phone}: ${messageContent.substring(0, 50)}...`);
      
      // Forward to CRM webhook
      try {
        const webhookPayload = {
          from: phone,
          pushName: pushName,
          messageId: msg.key.id,
          messageContent: messageContent,
          messageType: messageType,
          mediaUrl: mediaUrl,
          // Send media as base64 if downloaded
          mediaBase64: mediaBuffer ? mediaBuffer.toString('base64') : null,
          mediaMimeType: msg.message?.imageMessage?.mimetype || 
                        msg.message?.videoMessage?.mimetype || 
                        msg.message?.audioMessage?.mimetype || 
                        msg.message?.documentMessage?.mimetype || null,
          timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
          raw: {
            key: msg.key,
            messageType: Object.keys(msg.message || {})[0]
          }
        };
        
        fetch(CRM_WEBHOOK_URL, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-bridge-secret": BRIDGE_SECRET
          },
          body: JSON.stringify(webhookPayload)
        }).then(res => {
          if (res.ok) console.log(`✅ Forwarded to CRM: ${phone}`);
          else console.log(`⚠️ CRM webhook returned ${res.status}`);
        }).catch(err => {
          console.error(`❌ CRM webhook error: ${err.message}`);
        });
      } catch (webhookErr) {
        console.error("Webhook forward error:", webhookErr.message);
      }
    }
  });
}

// Helper: format phone to JID
function toJid(phone) {
  let jid = phone;
  if (!jid.includes("@")) {
    jid = jid.replace(/\D/g, "") + "@s.whatsapp.net";
  } else if (jid.includes("@c.us")) {
    jid = jid.replace("@c.us", "@s.whatsapp.net");
  }
  return jid;
}

app.get("/status", authMiddleware, (req, res) => {
  res.json({
    status: sessionReady ? "connected" : (qrCode ? "qr" : "disconnected"),
    hasQr: !!qrCode,
    sessionReady,
    qr: qrCode || null,
    chatCount: 0,
    lidMappings: Object.keys(lidToPhoneMap).length
  });
});

// Get/Set LID to phone mappings
app.get("/lid-mappings", authMiddleware, (req, res) => {
  res.json({
    success: true,
    count: Object.keys(lidToPhoneMap).length,
    lidToPhone: lidToPhoneMap,
    phoneToLid: phoneToLidMap
  });
});

// Add a LID to phone mapping manually
app.post("/lid-mappings", authMiddleware, (req, res) => {
  const { lid, phone } = req.body;
  if (!lid || !phone) {
    return res.status(400).json({ error: "Missing lid or phone" });
  }
  updateLidMapping(lid, phone);
  saveData();
  res.json({ success: true, lid, phone });
});

// Bulk add LID mappings from CRM leads
app.post("/lid-mappings/bulk", authMiddleware, (req, res) => {
  const { mappings } = req.body;
  if (!mappings || !Array.isArray(mappings)) {
    return res.status(400).json({ error: "Missing mappings array" });
  }
  let added = 0;
  for (const m of mappings) {
    if (m.lid && m.phone) {
      updateLidMapping(m.lid, m.phone);
      added++;
    }
  }
  saveData();
  res.json({ success: true, added, total: Object.keys(lidToPhoneMap).length });
});

// Discover LID for a phone number by checking onWhatsApp
app.post("/discover-lid", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ error: "WhatsApp not connected" });
  
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Missing phone" });
  
  try {
    const jid = toJid(phone);
    const cleanPhone = phone.replace(/\D/g, "");
    
    // Check if on WhatsApp and get the user info
    const [result] = await sock.onWhatsApp(jid);
    
    if (result && result.exists) {
      console.log(`📇 onWhatsApp result for ${phone}:`, JSON.stringify(result));
      
      // result.jid might be the LID format
      if (result.jid && result.jid.includes("@lid")) {
        const lid = result.jid.replace("@lid", "");
        updateLidMapping(lid, cleanPhone);
        saveData();
        return res.json({ success: true, phone: cleanPhone, lid, exists: true, jid: result.jid });
      }
      
      return res.json({ 
        success: true, 
        phone: cleanPhone, 
        exists: true, 
        jid: result.jid,
        note: "No LID returned, phone uses standard format"
      });
    }
    
    return res.json({ success: false, phone: cleanPhone, exists: false });
  } catch (err) {
    console.error("discover-lid error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Discover LIDs for multiple phone numbers
app.post("/discover-lids", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ error: "WhatsApp not connected" });
  
  const { phones } = req.body;
  if (!phones || !Array.isArray(phones)) return res.status(400).json({ error: "Missing phones array" });
  
  const results = [];
  let discovered = 0;
  
  for (const phone of phones.slice(0, 50)) { // Limit to 50 at a time
    try {
      const jid = toJid(phone);
      const cleanPhone = phone.replace(/\D/g, "");
      
      const [result] = await sock.onWhatsApp(jid);
      
      if (result && result.exists) {
        if (result.jid && result.jid.includes("@lid")) {
          const lid = result.jid.replace("@lid", "");
          updateLidMapping(lid, cleanPhone);
          discovered++;
          results.push({ phone: cleanPhone, lid, exists: true });
        } else {
          results.push({ phone: cleanPhone, exists: true, jid: result.jid });
        }
      } else {
        results.push({ phone: cleanPhone, exists: false });
      }
      
      // Small delay to avoid rate limiting
      await sleep(100);
    } catch (err) {
      results.push({ phone, error: err.message });
    }
  }
  
  if (discovered > 0) saveData();
  
  res.json({ success: true, total: phones.length, discovered, results });
});

app.get("/qr", authMiddleware, (req, res) => {
  if (sessionReady) return res.json({ ok: true, status: "connected", hasQr: false, message: "Already connected" });
  if (!qrCode) return res.json({ ok: false, status: "disconnected", hasQr: false, message: "QR not ready yet" });
  res.json({ ok: true, status: "qr", hasQr: true, qrCode });
});

app.get("/chats", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ error: "WhatsApp not connected" });
  res.json([]);
});

// Get all WhatsApp groups the user is participating in
app.get("/groups", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ error: "WhatsApp not connected" });
  
  try {
    console.log("[GROUPS] Fetching all participating groups...");
    const groups = await sock.groupFetchAllParticipating();
    
    // Convert to array format with key info
    const groupList = Object.entries(groups).map(([id, group]) => ({
      id: id,
      name: group.subject || "Unknown",
      owner: group.owner || null,
      creation: group.creation || null,
      participantsCount: group.participants?.length || 0,
      description: group.desc || null
    }));
    
    console.log(`[GROUPS] Found ${groupList.length} groups`);
    res.json({ success: true, count: groupList.length, groups: groupList });
  } catch (err) {
    console.error("[GROUPS] Error fetching groups:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get group info from invite link (without joining)
app.get("/group-invite/:code", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ error: "WhatsApp not connected" });
  
  try {
    const inviteCode = req.params.code;
    console.log("[GROUP-INVITE] Getting info for invite code:", inviteCode);
    
    const groupInfo = await sock.groupGetInviteInfo(inviteCode);
    
    res.json({
      success: true,
      group: {
        id: groupInfo.id,
        name: groupInfo.subject,
        owner: groupInfo.owner,
        creation: groupInfo.creation,
        participantsCount: groupInfo.size || groupInfo.participants?.length || 0,
        description: groupInfo.desc || null
      }
    });
  } catch (err) {
    console.error("[GROUP-INVITE] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Join a group using invite link
app.post("/group-join", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ error: "WhatsApp not connected" });
  
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "inviteCode is required" });
    
    console.log("[GROUP-JOIN] Joining group with invite code:", inviteCode);
    
    const groupId = await sock.groupAcceptInvite(inviteCode);
    
    res.json({
      success: true,
      message: "Successfully joined group",
      groupId: groupId
    });
  } catch (err) {
    console.error("[GROUP-JOIN] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get messages for a chat (group or individual)
// Note: Baileys doesn't store historical messages - this returns empty array
// Messages are stored in MongoDB via the CRM webhook, so fetch from there instead
app.get("/messages/:chatId", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ error: "WhatsApp not connected" });
  
  try {
    const chatId = decodeURIComponent(req.params.chatId);
    console.log("[MESSAGES] Fetching messages for:", chatId);
    
    // Baileys doesn't have a built-in message store
    // Return empty array with info - frontend should fetch from MongoDB instead
    res.json({ 
      success: true, 
      messages: [],
      chatId,
      note: "Baileys does not store historical messages. Use CRM API /api/admin/crm/whatsapp/messages to fetch from MongoDB."
    });
  } catch (err) {
    console.error("[MESSAGES] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ BROADCAST SETTINGS ENDPOINTS ============

// Get broadcast settings
app.get("/broadcast/settings", authMiddleware, (req, res) => {
  res.json({ success: true, settings: broadcastSettings });
});

// Update broadcast settings
app.post("/broadcast/settings", authMiddleware, (req, res) => {
  const { delayBetweenMessages, gapAfterMessages, gapPauseDuration, allowedStartHour, allowedEndHour, enabled } = req.body;
  
  if (delayBetweenMessages !== undefined) broadcastSettings.delayBetweenMessages = Math.max(1000, delayBetweenMessages);
  if (gapAfterMessages !== undefined) broadcastSettings.gapAfterMessages = Math.max(1, gapAfterMessages);
  if (gapPauseDuration !== undefined) broadcastSettings.gapPauseDuration = Math.max(5000, gapPauseDuration);
  if (allowedStartHour !== undefined) broadcastSettings.allowedStartHour = Math.max(0, Math.min(23, allowedStartHour));
  if (allowedEndHour !== undefined) broadcastSettings.allowedEndHour = Math.max(1, Math.min(24, allowedEndHour));
  if (enabled !== undefined) broadcastSettings.enabled = enabled;
  
  saveData();
  res.json({ success: true, settings: broadcastSettings });
});

// ============ BROADCAST REPORT ENDPOINTS ============

// Get broadcast report
app.get("/broadcast/report", authMiddleware, (req, res) => {
  const { broadcastId, from, to } = req.query;
  
  let messages = Object.entries(messageTracking).map(([id, data]) => ({ id, ...data }));
  
  // Filter by broadcastId if provided
  if (broadcastId) {
    messages = messages.filter(m => m.broadcastId === broadcastId);
  }
  
  // Filter by date range
  if (from) messages = messages.filter(m => m.timestamp >= new Date(from).getTime());
  if (to) messages = messages.filter(m => m.timestamp <= new Date(to).getTime());
  
  // Calculate stats
  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.status === "sent").length,
    delivered: messages.filter(m => m.status === "delivered").length,
    read: messages.filter(m => m.status === "read").length,
    failed: messages.filter(m => m.status === "failed").length,
    blocked: messages.filter(m => m.blocked).length
  };
  
  res.json({ success: true, stats, messages, blockedNumbers: [...blockedNumbers] });
});

// Get blocked numbers
app.get("/broadcast/blocked", authMiddleware, (req, res) => {
  res.json({ success: true, blockedNumbers: [...blockedNumbers] });
});

// Remove from blocked list
app.delete("/broadcast/blocked/:phone", authMiddleware, (req, res) => {
  const phone = req.params.phone.replace(/\D/g, "");
  blockedNumbers.delete(phone);
  saveData();
  res.json({ success: true, message: "Number removed from blocked list" });
});

// ============ BULK BROADCAST ENDPOINT ============

app.post("/broadcast", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { recipients, message, imageUrl, buttons, footerText, schedule } = req.body;
  
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ success: false, error: "Recipients array required" });
  }
  
  // Check if scheduled for later
  if (schedule) {
    const scheduleTime = new Date(schedule).getTime();
    if (scheduleTime > Date.now()) {
      const broadcastId = `broadcast_${Date.now()}`;
      scheduledBroadcasts.push({
        id: broadcastId,
        recipients,
        message,
        imageUrl,
        buttons,
        footerText,
        scheduleTime,
        status: "scheduled",
        createdAt: Date.now()
      });
      saveData();
      return res.json({ success: true, scheduled: true, broadcastId, scheduleTime });
    }
  }
  
  // Check allowed hours
  if (!isWithinAllowedHours()) {
    return res.status(400).json({ 
      success: false, 
      error: `Broadcast only allowed between ${broadcastSettings.allowedStartHour}:00 and ${broadcastSettings.allowedEndHour}:00` 
    });
  }
  
  // Start broadcast in background
  const broadcastId = `broadcast_${Date.now()}`;
  res.json({ success: true, broadcastId, message: "Broadcast started", totalRecipients: recipients.length });
  
  // Run broadcast asynchronously
  runBroadcast(broadcastId, recipients, message, imageUrl, buttons, footerText);
});

async function runBroadcast(broadcastId, recipients, message, imageUrl, buttons, footerText) {
  console.log(`Starting broadcast ${broadcastId} to ${recipients.length} recipients`);
  
  let sent = 0, failed = 0;
  
  for (let i = 0; i < recipients.length; i++) {
    const phone = recipients[i].replace(/\D/g, "");
    
    // Skip blocked numbers
    if (blockedNumbers.has(phone)) {
      messageTracking[`${broadcastId}_${phone}`] = {
        phone, broadcastId, status: "skipped", blocked: true, timestamp: Date.now()
      };
      failed++;
      continue;
    }
    
    // Check allowed hours during broadcast
    if (!isWithinAllowedHours()) {
      console.log("Outside allowed hours, pausing broadcast");
      // Save remaining for later
      const remaining = recipients.slice(i);
      scheduledBroadcasts.push({
        id: `${broadcastId}_resumed`,
        recipients: remaining,
        message, imageUrl, buttons, footerText,
        scheduleTime: getNextAllowedTime(),
        status: "scheduled",
        originalBroadcastId: broadcastId
      });
      saveData();
      break;
    }
    
    try {
      const jid = toJid(phone);
      let result;
      
      if (buttons && buttons.length > 0) {
        // Send with buttons
        const buttonRows = buttons.slice(0, 3).map((btn, idx) => ({
          buttonId: `btn_${idx}`,
          buttonText: { displayText: typeof btn === 'string' ? btn : btn.text || btn },
          type: 1
        }));
        
        if (imageUrl) {
          result = await sock.sendMessage(jid, {
            image: { url: imageUrl },
            caption: message || "",
            footer: footerText || "Swar Yoga",
            buttons: buttonRows,
            headerType: 4
          });
        } else {
          result = await sock.sendMessage(jid, {
            text: message || "",
            footer: footerText || "Swar Yoga",
            buttons: buttonRows,
            headerType: 1
          });
        }
      } else if (imageUrl) {
        result = await sock.sendMessage(jid, { image: { url: imageUrl }, caption: message || "" });
      } else {
        result = await sock.sendMessage(jid, { text: message });
      }
      
      const msgId = result?.key?.id || `${broadcastId}_${phone}`;
      messageTracking[msgId] = {
        phone, broadcastId, status: "sent", timestamp: Date.now()
      };
      sent++;
      console.log(`Sent to ${phone} (${sent}/${recipients.length})`);
      
    } catch (err) {
      console.error(`Failed to send to ${phone}:`, err.message);
      messageTracking[`${broadcastId}_${phone}`] = {
        phone, broadcastId, status: "failed", error: err.message, timestamp: Date.now()
      };
      
      // Check if blocked
      if (err.message.includes("blocked") || err.message.includes("not on WhatsApp")) {
        blockedNumbers.add(phone);
        messageTracking[`${broadcastId}_${phone}`].blocked = true;
      }
      failed++;
    }
    
    // Delay between messages
    await sleep(broadcastSettings.delayBetweenMessages);
    
    // Gap pause after N messages
    if ((i + 1) % broadcastSettings.gapAfterMessages === 0 && i < recipients.length - 1) {
      console.log(`Pausing for ${broadcastSettings.gapPauseDuration/1000}s after ${i + 1} messages`);
      await sleep(broadcastSettings.gapPauseDuration);
    }
  }
  
  saveData();
  console.log(`Broadcast ${broadcastId} complete: ${sent} sent, ${failed} failed`);
}

function getNextAllowedTime() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(broadcastSettings.allowedStartHour, 0, 0, 0);
  if (now.getHours() >= broadcastSettings.allowedEndHour) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

// ============ SCHEDULED BROADCASTS ============

app.get("/broadcast/scheduled", authMiddleware, (req, res) => {
  res.json({ success: true, scheduled: scheduledBroadcasts });
});

app.delete("/broadcast/scheduled/:id", authMiddleware, (req, res) => {
  scheduledBroadcasts = scheduledBroadcasts.filter(b => b.id !== req.params.id);
  saveData();
  res.json({ success: true, message: "Scheduled broadcast cancelled" });
});

// Check and run scheduled broadcasts every minute
setInterval(() => {
  if (!sessionReady) return;
  
  const now = Date.now();
  const toRun = scheduledBroadcasts.filter(b => b.status === "scheduled" && b.scheduleTime <= now);
  
  for (const broadcast of toRun) {
    broadcast.status = "running";
    saveData();
    runBroadcast(broadcast.id, broadcast.recipients, broadcast.message, broadcast.imageUrl, broadcast.buttons, broadcast.footerText);
  }
  
  // Remove completed
  scheduledBroadcasts = scheduledBroadcasts.filter(b => b.status === "scheduled");
  saveData();
}, 60000);

// Simple text/media send
app.post("/send", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { to, message, type = "text", url, caption } = req.body;
  if (!to) return res.status(400).json({ success: false, error: "Missing recipient" });

  try {
    const jid = toJid(to);
    const phone = to.replace(/\D/g, "");
    let result;

    if (type === "text") {
      result = await sock.sendMessage(jid, { text: message });
    } else if (type === "image" && url) {
      result = await sock.sendMessage(jid, { image: { url }, caption: caption || "" });
    } else if (type === "video" && url) {
      result = await sock.sendMessage(jid, { video: { url }, caption: caption || "" });
    } else if (type === "document" && url) {
      result = await sock.sendMessage(jid, { document: { url }, caption: caption || "", fileName: "document" });
    } else if (type === "audio" && url) {
      result = await sock.sendMessage(jid, { audio: { url }, mimetype: "audio/mp4" });
    }

    // Capture LID mapping from response if available
    if (result?.key?.remoteJid?.includes("@lid")) {
      const lid = result.key.remoteJid.replace("@lid", "");
      updateLidMapping(lid, phone);
      saveData();
      console.log(`📇 Captured LID mapping from send: ${lid} -> ${phone}`);
    }

    console.log("Message sent to", jid);
    res.json({ success: true, id: result?.key?.id });
  } catch (err) {
    console.error("Send error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Template card with image and buttons (for 1-1 QR messaging)
// STRATEGY: Send image first (if any), then text with button options
// This ensures image is always visible since WhatsApp button formats are unreliable
app.post("/send-template", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { to, imageUrl, bodyText, buttons = [], footerText = "Swar Yoga", headerText } = req.body;
  if (!to) return res.status(400).json({ success: false, error: "Missing recipient" });

  try {
    const jid = toJid(to);
    const messageIds = [];
    
    // Check if bodyText already contains the footer to avoid duplication
    const bodyAlreadyHasFooter = bodyText && footerText && 
      bodyText.toLowerCase().trim().endsWith(footerText.toLowerCase().trim());
    const effectiveFooter = bodyAlreadyHasFooter ? '' : footerText;

    // STEP 1: Send image first (if provided)
    if (imageUrl) {
      try {
        console.log("📷 Sending image:", imageUrl.substring(0, 50));
        const imgResult = await sock.sendMessage(jid, { 
          image: { url: imageUrl }, 
          caption: bodyText || "" // Just the body text as caption
        });
        if (imgResult?.key?.id) {
          messageIds.push(imgResult.key.id);
          console.log("✅ Image sent successfully");
        }
      } catch (imgErr) {
        console.log("⚠️ Image send failed:", imgErr.message);
      }
    }

    // STEP 2: Send interactive buttons (if provided)
    if (buttons && buttons.length > 0) {
      const validButtons = buttons.slice(0, 3).filter(b => b);
      
      if (validButtons.length > 0) {
        const bodyContent = imageUrl ? "" : (bodyText || "Please select an option");
        const footerContent = effectiveFooter || "Swar Yoga";
        
        // METHOD 1: nativeFlowMessage with viewOnceMessage wrapper (experimental 2024+)
        try {
          console.log("🔵 [1/4] Trying nativeFlowMessage (viewOnce wrapper)...");
          
          const nativeButtons = validButtons.map((btn, idx) => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: typeof btn === "string" ? btn : (btn.text || btn.title || btn),
              id: `btn_${idx}`
            })
          }));

          const interactiveMsg = {
            viewOnceMessage: {
              message: {
                interactiveMessage: {
                  body: { text: bodyContent },
                  footer: { text: footerContent },
                  nativeFlowMessage: {
                    buttons: nativeButtons,
                    messageParamsJson: ""
                  }
                }
              }
            }
          };

          const btnResult = await sock.sendMessage(jid, interactiveMsg);
          if (btnResult?.key?.id) {
            messageIds.push(btnResult.key.id);
            console.log("✅ nativeFlowMessage (viewOnce) sent!");
            return res.json({ 
              success: true, 
              messageIds,
              method: "native_flow_viewonce",
              note: "Interactive buttons sent successfully"
            });
          }
        } catch (err1) {
          console.log("⚠️ Method 1 failed:", err1.message);
        }

        // METHOD 2: Direct interactiveMessage without viewOnce wrapper
        try {
          console.log("🔵 [2/4] Trying direct interactiveMessage...");
          
          const nativeButtons = validButtons.map((btn, idx) => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: typeof btn === "string" ? btn : (btn.text || btn.title || btn),
              id: `btn_${idx}`
            })
          }));

          const directInteractive = {
            interactiveMessage: {
              body: { text: bodyContent },
              footer: { text: footerContent },
              nativeFlowMessage: {
                buttons: nativeButtons,
                messageParamsJson: ""
              }
            }
          };

          const btnResult2 = await sock.sendMessage(jid, directInteractive);
          if (btnResult2?.key?.id) {
            messageIds.push(btnResult2.key.id);
            console.log("✅ Direct interactiveMessage sent!");
            return res.json({ 
              success: true, 
              messageIds,
              method: "direct_interactive",
              note: "Interactive buttons sent"
            });
          }
        } catch (err2) {
          console.log("⚠️ Method 2 failed:", err2.message);
        }

        // METHOD 3: Legacy buttonsMessage (deprecated but try anyway)
        try {
          console.log("🔵 [3/4] Trying legacy buttonsMessage...");
          const buttonRows = validButtons.map((btn, idx) => ({
            buttonId: `btn_${idx}`,
            buttonText: { displayText: typeof btn === "string" ? btn : (btn.text || btn.title || btn) },
            type: 1
          }));

          const buttonsMsg = {
            text: bodyContent,
            footer: footerContent,
            buttons: buttonRows,
            headerType: 1
          };

          const btnResult3 = await sock.sendMessage(jid, buttonsMsg);
          if (btnResult3?.key?.id) {
            messageIds.push(btnResult3.key.id);
            console.log("✅ Legacy buttonsMessage sent!");
            return res.json({ 
              success: true, 
              messageIds,
              method: "legacy_buttons",
              note: "Buttons sent via legacy format"
            });
          }
        } catch (err3) {
          console.log("⚠️ Method 3 failed:", err3.message);
        }

        // METHOD 4: templateMessage with quick reply buttons (another experimental format)
        try {
          console.log("🔵 [4/4] Trying templateMessage format...");
          const templateButtons = validButtons.map((btn, idx) => ({
            index: idx + 1,
            quickReplyButton: {
              displayText: typeof btn === "string" ? btn : (btn.text || btn.title || btn),
              id: `btn_${idx}`
            }
          }));

          const templateMsg = {
            templateMessage: {
              hydratedTemplate: {
                hydratedContentText: bodyContent,
                hydratedFooterText: footerContent,
                hydratedButtons: templateButtons
              }
            }
          };

          const btnResult4 = await sock.sendMessage(jid, templateMsg);
          if (btnResult4?.key?.id) {
            messageIds.push(btnResult4.key.id);
            console.log("✅ templateMessage sent!");
            return res.json({ 
              success: true, 
              messageIds,
              method: "template_message",
              note: "Buttons sent via template format"
            });
          }
        } catch (err4) {
          console.log("⚠️ Method 4 failed:", err4.message);
        }

        // FINAL FALLBACK: Numbered text list (always works)
        console.log("📝 All button methods failed. Falling back to numbered text...");
        const buttonList = validButtons.map((b, i) => {
          const text = typeof b === 'string' ? b : (b.text || b.title || b);
          return `${i + 1}️⃣ *${text}*`;
        }).join("\n");
        
        let fallbackText = imageUrl ? "" : (bodyText ? bodyText + "\n\n" : "");
        fallbackText += buttonList;
        if (effectiveFooter) {
          fallbackText += "\n\n_" + effectiveFooter + "_";
        }
        
        const textResult = await sock.sendMessage(jid, { text: fallbackText });
        if (textResult?.key?.id) {
          messageIds.push(textResult.key.id);
        }
        
        return res.json({ 
          success: true, 
          messageIds,
          method: "text_fallback",
          warning: "Native buttons deprecated by WhatsApp for unofficial APIs. Sent as numbered text list."
        });
      }
    } else if (!imageUrl) {
      // No buttons and no image - just send text
      let textContent = bodyText || "";
      if (effectiveFooter) {
        textContent += "\n\n_" + effectiveFooter + "_";
      }
      const textResult = await sock.sendMessage(jid, { text: textContent });
      if (textResult?.key?.id) {
        messageIds.push(textResult.key.id);
      }
    }

    console.log("✅ Template sent to", jid, "messageIds:", messageIds);
    res.json({ success: true, messageIds });
  } catch (err) {
    console.error("Send template error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send image only
app.post("/send-image", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { to, imageUrl, caption } = req.body;
  if (!to || !imageUrl) return res.status(400).json({ success: false, error: "Missing recipient or imageUrl" });

  try {
    const jid = toJid(to);
    const result = await sock.sendMessage(jid, { 
      image: { url: imageUrl }, 
      caption: caption || "" 
    });
    console.log("Image sent to", jid);
    res.json({ success: true, id: result?.key?.id });
  } catch (err) {
    console.error("Send image error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send buttons message (blue interactive buttons) - Multiple experimental formats
app.post("/send-buttons", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { to, text, buttons, footer, imageUrl } = req.body;
  if (!to || !buttons || buttons.length === 0) {
    return res.status(400).json({ success: false, error: "Missing recipient or buttons" });
  }

  try {
    const jid = toJid(to);
    const validButtons = buttons.slice(0, 3).filter(b => b);
    const bodyContent = text || "Please select an option";
    const footerContent = footer || "Swar Yoga";

    // METHOD 1: nativeFlowMessage with viewOnceMessage wrapper
    try {
      console.log("🔵 [1/4] send-buttons: nativeFlowMessage...");
      const nativeButtons = validButtons.map((btn, idx) => ({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: typeof btn === 'string' ? btn : (btn.text || btn),
          id: `btn_${idx}`
        })
      }));

      const interactiveMsg = {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: { text: bodyContent },
              footer: { text: footerContent },
              nativeFlowMessage: {
                buttons: nativeButtons,
                messageParamsJson: ""
              }
            }
          }
        }
      };

      const result = await sock.sendMessage(jid, interactiveMsg);
      if (result?.key?.id) {
        console.log("✅ nativeFlowMessage buttons sent");
        return res.json({ success: true, id: result.key.id, method: "native_flow" });
      }
    } catch (e1) {
      console.log("⚠️ Method 1 failed:", e1.message);
    }

    // METHOD 2: Direct interactiveMessage
    try {
      console.log("🔵 [2/4] send-buttons: direct interactive...");
      const nativeButtons = validButtons.map((btn, idx) => ({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: typeof btn === 'string' ? btn : (btn.text || btn),
          id: `btn_${idx}`
        })
      }));

      const directMsg = {
        interactiveMessage: {
          body: { text: bodyContent },
          footer: { text: footerContent },
          nativeFlowMessage: {
            buttons: nativeButtons,
            messageParamsJson: ""
          }
        }
      };

      const result = await sock.sendMessage(jid, directMsg);
      if (result?.key?.id) {
        console.log("✅ Direct interactive sent");
        return res.json({ success: true, id: result.key.id, method: "direct_interactive" });
      }
    } catch (e2) {
      console.log("⚠️ Method 2 failed:", e2.message);
    }

    // METHOD 3: Legacy buttonsMessage
    try {
      console.log("🔵 [3/4] send-buttons: legacy buttons...");
      const buttonRows = validButtons.map((btn, idx) => ({
        buttonId: `btn_${idx}`,
        buttonText: { displayText: typeof btn === 'string' ? btn : (btn.text || btn) },
        type: 1
      }));

      let msg;
      if (imageUrl) {
        msg = {
          image: { url: imageUrl },
          caption: bodyContent,
          footer: footerContent,
          buttons: buttonRows,
          headerType: 4
        };
      } else {
        msg = {
          text: bodyContent,
          footer: footerContent,
          buttons: buttonRows,
          headerType: 1
        };
      }

      const result = await sock.sendMessage(jid, msg);
      if (result?.key?.id) {
        console.log("✅ Legacy buttons sent");
        return res.json({ success: true, id: result.key.id, method: "legacy_buttons" });
      }
    } catch (e3) {
      console.log("⚠️ Method 3 failed:", e3.message);
    }

    // METHOD 4: templateMessage with hydratedButtons
    try {
      console.log("🔵 [4/4] send-buttons: templateMessage...");
      const templateButtons = validButtons.map((btn, idx) => ({
        index: idx + 1,
        quickReplyButton: {
          displayText: typeof btn === 'string' ? btn : (btn.text || btn),
          id: `btn_${idx}`
        }
      }));

      const templateMsg = {
        templateMessage: {
          hydratedTemplate: {
            hydratedContentText: bodyContent,
            hydratedFooterText: footerContent,
            hydratedButtons: templateButtons
          }
        }
      };

      const result = await sock.sendMessage(jid, templateMsg);
      if (result?.key?.id) {
        console.log("✅ Template message sent");
        return res.json({ success: true, id: result.key.id, method: "template_message" });
      }
    } catch (e4) {
      console.log("⚠️ Method 4 failed:", e4.message);
    }

    // FINAL FALLBACK: Text-based buttons
    console.log("📝 All button formats failed, sending as text...");
    const btnText = validButtons.map((b, i) => `${i + 1}️⃣ *${typeof b === 'string' ? b : (b.text || b)}*`).join("\n");
    const fullText = `${bodyContent}\n\n${btnText}\n\n_${footerContent}_`;
    
    let result;
    if (imageUrl) {
      result = await sock.sendMessage(jid, { image: { url: imageUrl }, caption: fullText });
    } else {
      result = await sock.sendMessage(jid, { text: fullText });
    }
    
    return res.json({ 
      success: true, 
      id: result?.key?.id, 
      method: "text_fallback",
      warning: "WhatsApp deprecated buttons for unofficial APIs. Sent as numbered text."
    });

  } catch (err) {
    console.error("Send buttons error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send list message (for menus)
app.post("/send-list", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { to, text, buttonText, sections, footer } = req.body;
  if (!to || !sections) {
    return res.status(400).json({ success: false, error: "Missing recipient or sections" });
  }

  try {
    const jid = toJid(to);
    
    const msg = {
      text: text || "Select an option",
      footer: footer || "Swar Yoga",
      title: "Menu",
      buttonText: buttonText || "Options",
      sections: sections
    };

    const result = await sock.sendMessage(jid, msg);
    console.log("List message sent to", jid);
    res.json({ success: true, id: result?.key?.id });
  } catch (err) {
    console.error("Send list error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

process.on("SIGINT", () => console.log("SIGINT"));
process.on("SIGTERM", () => console.log("SIGTERM"));

app.listen(PORT, "0.0.0.0", () => {
  console.log("Baileys Bridge on port", PORT);
  console.log("Endpoints: /send, /send-template, /send-image, /send-buttons, /send-list");
  initializeClient();
});
