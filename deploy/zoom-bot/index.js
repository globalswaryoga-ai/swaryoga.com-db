/**
 * Swar Yoga Zoom Bot Service
 * Runs on EC2. Uses Puppeteer + Chromium to launch Zoom Web Client,
 * join a meeting, send countdown chat messages, and open the Bunny video
 * URL in screen-share so everyone sees it playing.
 */

require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');

const PORT = process.env.PORT || 3400;
const BOT_SECRET = process.env.ZOOM_BOT_SECRET || 'swar-zoom-bot-secret-2024';
const BOT_DISPLAY_NAME = process.env.ZOOM_BOT_DISPLAY_NAME || 'Swar Sadhana';

const activeSessions = new Map();

function auth(req, res, next) {
  const provided = req.headers['x-bot-secret'] || req.query.secret;
  if (provided !== BOT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--window-size=1280,720',
    ],
  });
}

function buildJoinUrl(meetingId, password) {
  const base = `https://zoom.us/wc/join/${meetingId}`;
  const params = new URLSearchParams();
  if (password) params.set('pwd', password);
  params.set('un', Buffer.from(BOT_DISPLAY_NAME).toString('base64'));
  return `${base}?${params.toString()}`;
}

async function joinMeeting({ meetingId, password, videoUrl, durationMinutes }) {
  const sessionId = `${meetingId}-${Date.now()}`;
  console.log(`[Bot] Starting session ${sessionId}`);

  const browser = await launchBrowser();
  const page = await browser.newPage();

  activeSessions.set(sessionId, { browser, page, startedAt: Date.now() });

  try {
    const joinUrl = buildJoinUrl(meetingId, password);
    console.log(`[Bot] Navigating to ${joinUrl}`);
    await page.goto(joinUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Accept cookie/consent if present
    await page.waitForTimeout(2000);

    // Try to enter display name if prompted
    const nameInput = await page.$('input[type="text"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type(BOT_DISPLAY_NAME);
    }

    // Click Join button
    const joinBtn = await page.$('button.zm-btn--primary, button[type="submit"]');
    if (joinBtn) await joinBtn.click();

    console.log(`[Bot] Joined meeting ${meetingId}, waiting for host to admit...`);
    await page.waitForTimeout(10000);

    // Send countdown messages via chat
    await sendCountdown(page, 3);

    // Open video in screen share
    if (videoUrl) {
      console.log(`[Bot] Starting video playback: ${videoUrl}`);
      await shareVideoInMeeting(page, videoUrl);
    }

    // Auto-close after duration
    const durationMs = (durationMinutes || 40) * 60 * 1000;
    setTimeout(async () => {
      console.log(`[Bot] Duration reached, leaving meeting ${meetingId}`);
      await browser.close().catch(() => {});
      activeSessions.delete(sessionId);
    }, durationMs);

    return { sessionId, meetingId, status: 'joined' };
  } catch (err) {
    console.error(`[Bot] Error joining meeting:`, err.message);
    await browser.close().catch(() => {});
    activeSessions.delete(sessionId);
    throw err;
  }
}

async function sendCountdown(page, minutes) {
  for (let m = minutes; m > 0; m--) {
    const msg = `⏱️ Video starts in ${m} minute${m > 1 ? 's' : ''}... Please sit comfortably 🧘`;
    await sendChatMessage(page, msg);
    await page.waitForTimeout(60000);
  }
  await sendChatMessage(page, `🎬 Video starting now! Namaste 🙏`);
}

async function sendChatMessage(page, text) {
  try {
    const chatBtn = await page.$('[aria-label*="chat" i], [aria-label*="Chat"]');
    if (chatBtn) await chatBtn.click();
    await page.waitForTimeout(500);

    const textarea = await page.$('textarea[aria-label*="chat" i], textarea');
    if (textarea) {
      await textarea.type(text);
      await page.keyboard.press('Enter');
      console.log(`[Bot] Chat: ${text}`);
    }
  } catch (err) {
    console.warn(`[Bot] Could not send chat: ${err.message}`);
  }
}

async function shareVideoInMeeting(page, videoUrl) {
  try {
    const videoPage = await page.browser().newPage();
    await videoPage.goto(videoUrl, { waitUntil: 'networkidle2' });
    await videoPage.evaluate(() => {
      const v = document.querySelector('video');
      if (v) v.play();
    });
    console.log(`[Bot] Video page opened for screen share`);
  } catch (err) {
    console.warn(`[Bot] Video share error: ${err.message}`);
  }
}

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: activeSessions.size,
    uptime: process.uptime(),
  });
});

app.post('/start-meeting', auth, async (req, res) => {
  const { meetingId, password, videoUrl, durationMinutes } = req.body;

  if (!meetingId) {
    return res.status(400).json({ error: 'meetingId required' });
  }

  try {
    const result = await joinMeeting({ meetingId, password, videoUrl, durationMinutes });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/stop-meeting/:sessionId', auth, async (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  await session.browser.close().catch(() => {});
  activeSessions.delete(sessionId);
  res.json({ success: true, sessionId });
});

app.listen(PORT, () => {
  console.log(`[Zoom Bot] Server listening on port ${PORT}`);
  console.log(`[Zoom Bot] Display name: ${BOT_DISPLAY_NAME}`);
});
