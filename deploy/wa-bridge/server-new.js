const express = require("express");
const qrcode = require("qrcode");
const cors = require("cors");
const fs = require("fs");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

const app = express();
const PORT = 3333;
const BRIDGE_SECRET = "swar-bridge-secret-2024";

app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], credentials: true, allowedHeaders: ["Content-Type", "x-bridge-secret"] }));
app.use(express.json());

const authMiddleware = (req, res, next) => {
  if (req.headers["x-bridge-secret"] !== BRIDGE_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
};

let client = null;
let qrCode = null;
let chats = [];
let sessionReady = false;

function initializeClient() {
  console.log("Initializing WhatsApp client...");
  
  if (client) { try { client.destroy(); } catch(e){} client = null; }

  client = new Client({
    authStrategy: new LocalAuth({ clientId: "swar-bridge", dataPath: "/tmp/.wwebjs_auth" }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--disable-extensions", "--single-process"]
    },
    webVersionCache: {
      type: "remote",
      remotePath: "https://raw.githubusercontent.com/AikosLab/AikosLabWaWeb-VCache/main/AikosLabWaWeb-VCache/index.html"
    }
  });

  client.on("qr", (qr) => {
    console.log("QR code received!");
    qrcode.toDataURL(qr, (err, url) => { if (!err) { qrCode = url; console.log("QR ready"); } });
  });

  client.on("ready", async () => {
    console.log("WhatsApp READY!");
    sessionReady = true;
    qrCode = null;
    try { chats = await client.getChats(); console.log("Loaded", chats.length, "chats"); } catch(e){}
  });

  client.on("authenticated", () => console.log("Authenticated"));
  client.on("auth_failure", (msg) => { console.error("Auth failure:", msg); sessionReady = false; });
  client.on("disconnected", (reason) => { console.log("Disconnected:", reason); sessionReady = false; qrCode = null; setTimeout(initializeClient, 5000); });

  client.initialize().catch(err => { console.error("Init error:", err.message); setTimeout(initializeClient, 15000); });
}

app.get("/status", authMiddleware, (req, res) => {
  res.json({ status: sessionReady ? "connected" : (qrCode ? "qr" : "disconnected"), hasQr: !!qrCode, sessionReady, qr: qrCode || null, chatCount: chats.length });
});

app.get("/qr", authMiddleware, (req, res) => {
  if (sessionReady) return res.json({ ok: true, status: "connected", hasQr: false });
  if (!qrCode) return res.json({ ok: false, status: "disconnected", hasQr: false, message: "QR not ready" });
  res.json({ ok: true, status: "qr", hasQr: true, qrCode });
});

app.get("/chats", authMiddleware, async (req, res) => {
  if (!client || !sessionReady) return res.status(503).json({ error: "WhatsApp not connected" });
  try { chats = await client.getChats(); res.json(chats.map(c => ({ id: c.id._serialized, name: c.name || c.id.user, isGroup: c.isGroup }))); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/send", authMiddleware, async (req, res) => {
  if (!client || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  const { to, message, type = "text", url, caption } = req.body;
  if (!to) return res.status(400).json({ success: false, error: "Missing recipient" });
  
  try {
    let chatId = to.includes("@") ? to : to.replace(/\D/g, "") + "@c.us";
    let result;
    if (type === "text") result = await client.sendMessage(chatId, message);
    else if (["image", "video", "audio", "document"].includes(type)) {
      const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
      result = await client.sendMessage(chatId, media, { caption: caption || "" });
    }
    res.json({ success: true, id: result?.id?._serialized });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

process.on("SIGINT", () => console.log("SIGINT"));
process.on("SIGTERM", () => console.log("SIGTERM"));

app.listen(PORT, "0.0.0.0", () => { console.log("Bridge on port", PORT); initializeClient(); });
