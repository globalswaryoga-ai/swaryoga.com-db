#!/usr/bin/env node

/**
 * Test YouTube Private Video Access via Cookies
 *
 * Usage:
 *   node scripts/test-youtube-cookies.js <VIDEO_ID_OR_URL>
 *
 * Reads YOUTUBE_COOKIES from .env.local (cookies exported from the invited
 * account swarsakshi9@gmail.com) and tries to fetch a PRIVATE video's stream.
 * Tells you straight whether it works — before we deploy anything.
 */

const fs = require('fs');
const path = require('path');

// ── Load .env.local ──
function loadEnvLocal() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnvLocal();

function extractId(input) {
  if (!input) return null;
  const m = input.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  return null;
}

(async () => {
  const arg = process.argv[2];
  const videoId = extractId(arg);

  if (!videoId) {
    console.error('❌ Usage: node scripts/test-youtube-cookies.js <VIDEO_ID_OR_URL>');
    process.exit(1);
  }

  const raw = process.env.YOUTUBE_COOKIES;
  if (!raw || !raw.trim()) {
    console.error('❌ YOUTUBE_COOKIES is not set in .env.local');
    console.error('   Export cookies from a browser logged in as swarsakshi9@gmail.com');
    process.exit(1);
  }

  let cookies;
  try {
    cookies = JSON.parse(raw);
  } catch {
    console.error('❌ YOUTUBE_COOKIES is not valid JSON. Re-export as JSON format.');
    process.exit(1);
  }
  if (!Array.isArray(cookies) || cookies.length === 0) {
    console.error('❌ YOUTUBE_COOKIES must be a non-empty JSON array of cookie objects.');
    process.exit(1);
  }

  console.log(`🍪 Loaded ${cookies.length} cookies`);
  const hasLogin = cookies.some((c) => c.name === 'SID' || c.name === '__Secure-3PSID');
  console.log(hasLogin ? '✅ Login cookies present (SID found)' : '⚠️  No SID cookie — may not be a logged-in session');
  console.log(`🎬 Testing video: ${videoId}\n`);

  try {
    const ytdl = require('@distube/ytdl-core');
    const agent = ytdl.createAgent(cookies);

    console.log('⏳ Fetching video info as the invited account...\n');
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, { agent });

    const vd = info.videoDetails || {};
    const playable = info.formats.filter((f) => f.hasVideo && f.hasAudio);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS — private video is accessible!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Title:        ${vd.title || '(unknown)'}`);
    console.log(`   Privacy:      ${vd.isPrivate ? 'PRIVATE 🔒' : (vd.isUnlisted ? 'unlisted' : 'public')}`);
    console.log(`   Total formats:    ${info.formats.length}`);
    console.log(`   Play-ready (A+V): ${playable.length}`);
    const heights = [...new Set(playable.map((f) => f.height).filter(Boolean))].sort((a, b) => b - a);
    console.log(`   Qualities:        ${heights.map((h) => h + 'p').join(', ') || '(muxed only)'}`);
    console.log('\n🎉 Cookies work. Add YOUTUBE_COOKIES to Vercel and it will play for members.\n');
    process.exit(0);
  } catch (err) {
    const msg = err.message || String(err);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Error: ${msg}\n`);
    if (/private|sign in|login|unavailable/i.test(msg)) {
      console.log('   Likely cause:');
      console.log('   • These cookies are NOT from the invited account, OR');
      console.log('   • swarsakshi9@gmail.com was not invited to THIS video, OR');
      console.log('   • The cookie session expired (re-export and try again).');
    }
    console.log('');
    process.exit(1);
  }
})();
