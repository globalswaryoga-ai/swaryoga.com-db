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

// Load saved data
function loadData() {
  try {
    const settingsFile = path.join(DATA_DIR, "settings.json");
    const trackingFile = path.join(DATA_DIR, "tracking.json");
    const blockedFile = path.join(DATA_DIR, "blocked.json");
    const scheduledFile = path.join(DATA_DIR, "scheduled.json");
    
    if (fs.existsSync(settingsFile)) broadcastSettings = JSON.parse(fs.readFileSync(settingsFile));
    if (fs.existsSync(trackingFile)) messageTracking = JSON.parse(fs.readFileSync(trackingFile));
    if (fs.existsSync(blockedFile)) blockedNumbers = new Set(JSON.parse(fs.readFileSync(blockedFile)));
    if (fs.existsSync(scheduledFile)) scheduledBroadcasts = JSON.parse(fs.readFileSync(scheduledFile));
    console.log("Data loaded successfully");
  } catch (e) { console.error("Load data error:", e.message); }
}

function saveData() {
  try {
    fs.writeFileSync(path.join(DATA_DIR, "settings.json"), JSON.stringify(broadcastSettings, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, "tracking.json"), JSON.stringify(messageTracking, null, 2));
    fs.writeFileSync(path.join(DATA_DIR, "blocked.json"), JSON.stringify([...blockedNumbers]));
    fs.writeFileSync(path.join(DATA_DIR, "scheduled.json"), JSON.stringify(scheduledBroadcasts, null, 2));
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
      
      // For @lid format, try to get real phone from participant or use the lid as identifier
      let phone = "";
      if (remoteJid.includes("@lid")) {
        // Check if there's a participant with real phone
        if (msg.key.participant) {
          phone = msg.key.participant.replace("@s.whatsapp.net", "").replace("@c.us", "");
        } else {
          // Use lid as identifier - we'll still forward it
          phone = remoteJid.replace("@lid", "");
          console.log("⚠️ @lid message, using lid as phone:", phone);
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
    chatCount: 0
  });
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
        // Try native interactive buttons (nativeFlowMessage format for 2024+)
        try {
          console.log("🔵 Trying native blue buttons...");
          
          const nativeButtons = validButtons.map((btn, idx) => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: typeof btn === "string" ? btn : (btn.text || btn.title || btn),
              id: "btn_" + idx
            })
          }));

          const interactiveMsg = {
            viewOnceMessage: {
              message: {
                interactiveMessage: {
                  body: { text: imageUrl ? "" : (bodyText || "Please select an option") },
                  footer: { text: effectiveFooter || "Swar Yoga" },
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
            console.log("✅ Native blue buttons sent!");
            return res.json({ 
              success: true, 
              messageIds,
              method: "native_buttons",
              note: "Blue buttons sent successfully"
            });
          }
        } catch (nativeErr) {
          console.log("⚠️ Native buttons failed:", nativeErr.message);
          
          // Fallback: Try buttonsMessage format
          try {
            console.log("🔄 Trying buttonsMessage format...");
            const buttonRows = validButtons.map((btn, idx) => ({
              buttonId: "btn_" + idx,
              buttonText: { displayText: typeof btn === "string" ? btn : (btn.text || btn.title || btn) },
              type: 1
            }));

            const buttonsMsg = {
              text: imageUrl ? "" : (bodyText || "Please select an option"),
              footer: effectiveFooter || "Swar Yoga",
              buttons: buttonRows,
              headerType: 1
            };

            const btnResult2 = await sock.sendMessage(jid, buttonsMsg);
            if (btnResult2?.key?.id) {
              messageIds.push(btnResult2.key.id);
              console.log("✅ Buttons message sent!");
              return res.json({ 
                success: true, 
                messageIds,
                method: "buttons_message",
                note: "Buttons sent"
              });
            }
          } catch (btnErr) {
            console.log("⚠️ buttonsMessage also failed:", btnErr.message);
          }
          
          // Final fallback: numbered text
          console.log("📝 Falling back to numbered text...");
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
            warning: "Native buttons not supported on this WhatsApp version, sent as numbered text"
          });
        }
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

// Send buttons message (blue interactive buttons)
app.post("/send-buttons", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { to, text, buttons, footer, imageUrl } = req.body;
  if (!to || !buttons || buttons.length === 0) {
    return res.status(400).json({ success: false, error: "Missing recipient or buttons" });
  }

  try {
    const jid = toJid(to);
    
    // Create button structure
    const buttonRows = buttons.slice(0, 3).map((btn, idx) => ({
      buttonId: `btn_${idx}`,
      buttonText: { displayText: typeof btn === 'string' ? btn : btn.text || btn },
      type: 1
    }));

    let msg;
    if (imageUrl) {
      msg = {
        image: { url: imageUrl },
        caption: text || "",
        footer: footer || "Swar Yoga",
        buttons: buttonRows,
        headerType: 4
      };
    } else {
      msg = {
        text: text || "",
        footer: footer || "Swar Yoga",
        buttons: buttonRows,
        headerType: 1
      };
    }

    const result = await sock.sendMessage(jid, msg);
    console.log("Buttons message sent to", jid);
    res.json({ success: true, id: result?.key?.id });
  } catch (err) {
    console.error("Send buttons error:", err.message);
    
    // Fallback to text-based buttons
    try {
      const jid = toJid(to);
      const btnText = buttons.map(b => `▸ ${typeof b === 'string' ? b : b.text || b}`).join("\n");
      const fullText = `${text || ""}\n\n${btnText}\n\n_${footer || "Swar Yoga"}_`;
      
      let result;
      if (imageUrl) {
        result = await sock.sendMessage(jid, { image: { url: imageUrl }, caption: fullText });
      } else {
        result = await sock.sendMessage(jid, { text: fullText });
      }
      
      res.json({ success: true, id: result?.key?.id, fallback: true });
    } catch (fallbackErr) {
      res.status(500).json({ success: false, error: err.message });
    }
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
