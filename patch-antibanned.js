const fs = require('fs');

let code = fs.readFileSync('deploy/wa-baileys/server_vps_copy.js', 'utf8');

// 1. Add sleep function and random delay utility
const utils = `
// ── Anti-Ban Utilities ───────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
`;
code = code.replace('// ── Config ──────────────────────────────────────────────────────────────', utils + '\n// ── Config ──────────────────────────────────────────────────────────────');

// 2. Add dynamic typing simulation and random delay to /send
const sendReplacement = `
// ── Send Message ────────────────────────────────────────────────────────
app.post('/send', async (req, res) => {
  const session = getSessionForRequest(req);
  if (session.connectionState !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected', status: session.connectionState });
  }

  const { to, message, type, media, caption } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing "to" field' });

  const toStr = String(to);
  let jid;
  if (toStr.includes('@g.us') || toStr.includes('@lid') || toStr.includes('@s.whatsapp.net')) jid = toStr;
  else if (toStr.includes('@')) jid = toStr;
  else jid = \`\${toStr.replace(/[^0-9]/g, '')}@s.whatsapp.net\`;

  try {
    let result;
    
    // --- ANTI-BAN: Random Base Delay ---
    // Wait randomly between 1 to 2.5 seconds to avoid robotic precision
    await sleep(getRandomDelay(1000, 2500));

    // --- ANTI-BAN: Typing Simulation ---
    if (type !== 'media') {
      try {
        await session.sock.sendPresenceUpdate('composing', jid);
        // Calculate typing delay: ~40ms per character, capped between 1s and 4s
        const msgLen = message ? message.length : 0;
        const typingDelay = Math.min(Math.max(msgLen * 40, 1000), 4000);
        await sleep(typingDelay);
        await session.sock.sendPresenceUpdate('paused', jid);
      } catch (e) {
        console.warn(\`[\${req.userId}] Typing simulation failed:\`, e.message);
      }
    } else {
      // Simulate recording or uploading media
      try {
        const isAudio = (req.body.mimetype || '').includes('audio');
        await session.sock.sendPresenceUpdate(isAudio ? 'recording' : 'composing', jid);
        await sleep(getRandomDelay(2000, 4500));
        await session.sock.sendPresenceUpdate('paused', jid);
      } catch (e) { }
    }

    if (type === 'media' && media) {
      const mediaBuffer = media.startsWith('data:')
        ? Buffer.from(media.split(',')[1], 'base64')
        : media.startsWith('http') ? await fetchMediaBuffer(media) : Buffer.from(media, 'base64');
      const mimeType = req.body.mimetype || (mime ? mime.lookup(media) : 'application/octet-stream') || 'application/octet-stream';
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');
      const isAudio = mimeType.startsWith('audio/');

      if (isImage) result = await session.sock.sendMessage(jid, { image: mediaBuffer, caption: caption || message || '', mimetype: mimeType });
      else if (isVideo) result = await session.sock.sendMessage(jid, { video: mediaBuffer, caption: caption || message || '', mimetype: mimeType });
      else if (isAudio) result = await session.sock.sendMessage(jid, { audio: mediaBuffer, mimetype: mimeType, ptt: mimeType.includes('ogg') });
      else result = await session.sock.sendMessage(jid, { document: mediaBuffer, mimetype: mimeType, fileName: req.body.fileName || 'file', caption: caption || message || '' });
    } else {
      result = await session.sock.sendMessage(jid, { text: message || '' });
    }
`;

code = code.replace(`// ── Send Message ────────────────────────────────────────────────────────
app.post('/send', async (req, res) => {
  const session = getSessionForRequest(req);
  if (session.connectionState !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected', status: session.connectionState });
  }

  const { to, message, type, media, caption } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing "to" field' });

  const toStr = String(to);
  let jid;
  if (toStr.includes('@g.us') || toStr.includes('@lid') || toStr.includes('@s.whatsapp.net')) jid = toStr;
  else if (toStr.includes('@')) jid = toStr;
  else jid = \`\${toStr.replace(/[^0-9]/g, '')}@s.whatsapp.net\`;

  try {
    let result;
    if (type === 'media' && media) {
      const mediaBuffer = media.startsWith('data:')
        ? Buffer.from(media.split(',')[1], 'base64')
        : media.startsWith('http') ? await fetchMediaBuffer(media) : Buffer.from(media, 'base64');
      const mimeType = req.body.mimetype || mime.lookup(media) || 'application/octet-stream';
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');
      const isAudio = mimeType.startsWith('audio/');

      if (isImage) result = await session.sock.sendMessage(jid, { image: mediaBuffer, caption: caption || message || '', mimetype: mimeType });
      else if (isVideo) result = await session.sock.sendMessage(jid, { video: mediaBuffer, caption: caption || message || '', mimetype: mimeType });
      else if (isAudio) result = await session.sock.sendMessage(jid, { audio: mediaBuffer, mimetype: mimeType, ptt: mimeType.includes('ogg') });
      else result = await session.sock.sendMessage(jid, { document: mediaBuffer, mimetype: mimeType, fileName: req.body.fileName || 'file', caption: caption || message || '' });
    } else {
      result = await session.sock.sendMessage(jid, { text: message || '' });
    }
`, sendReplacement);

// 3. Make sure reading receipts aren't automatic (already disabled in makeWASocket via missing markOnlineOnConnect, but ensure we don't send presence manually on read).
// No changes needed for read receipts as Baileys does not auto-send read receipts unless we call `sock.readMessages()`. 
// I will check if sock.readMessages is called and remove it or delay it.

fs.writeFileSync('deploy/wa-baileys/server_vps_patched.js', code);
console.log('Patch created!');
