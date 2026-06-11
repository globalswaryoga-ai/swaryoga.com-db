#!/usr/bin/env node

/**
 * Generate YouTube Refresh Token
 *
 * Usage: node scripts/generate-youtube-token.js
 *
 * This script opens Google OAuth flow to get a refresh token
 * that can be used to access private YouTube videos.
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Auto-load credentials from .env.local so they always match what the app uses
function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local not found — fall back to process.env
  }
}

loadEnvLocal();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/callback';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set in .env');
  process.exit(1);
}

console.log('🔐 YouTube Refresh Token Generator\n');
console.log('This will open Google OAuth in your browser.');
console.log('⚠️  Sign in with swarsakshi9@gmail.com (the INVITED account) — NOT 9999.\n');
console.log(`Using CLIENT_ID: ${CLIENT_ID ? CLIENT_ID.slice(0, 30) + '...' : 'MISSING'}\n`);

// Generate state for CSRF protection
const state = crypto.randomBytes(32).toString('hex');

// OAuth authorization URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.append('client_id', CLIENT_ID);
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly');
authUrl.searchParams.append('access_type', 'offline');
authUrl.searchParams.append('prompt', 'consent');
authUrl.searchParams.append('state', state);

// Start local server to receive callback
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/callback') {
    const receivedState = parsedUrl.query.state;
    const code = parsedUrl.query.code;
    const error = parsedUrl.query.error;

    // Verify state
    if (receivedState !== state) {
      res.writeHead(400);
      res.end('❌ State mismatch - possible CSRF attack');
      server.close();
      process.exit(1);
    }

    if (error) {
      res.writeHead(400);
      res.end(`❌ OAuth Error: ${error}`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400);
      res.end('❌ No authorization code received');
      server.close();
      process.exit(1);
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.refresh_token) {
        res.writeHead(400);
        res.end('❌ Failed to get refresh token. Check credentials.');
        server.close();
        process.exit(1);
      }

      const refreshToken = tokenData.refresh_token;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <head><title>✅ Token Generated</title></head>
          <body style="font-family: system-ui; padding: 40px; background: #f0f0f0;">
            <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
              <h2>✅ Refresh Token Generated!</h2>
              <p>Copy the token below and add to <code>.env</code>:</p>
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto;">
YOUTUBE_REFRESH_TOKEN=${refreshToken}
              </pre>
              <p>This window will close automatically...</p>
            </div>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);

      // Print to console too
      console.log('\n✅ Success! Refresh token generated:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(refreshToken);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 Add to .env.local:\n');
      console.log(`YOUTUBE_REFRESH_TOKEN=${refreshToken}\n`);
      console.log('Then redeploy and private videos will work! 🎬\n');

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    } catch (err) {
      console.error('Error exchanging code for token:', err);
      res.writeHead(500);
      res.end('❌ Error: ' + err.message);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3333, () => {
  console.log('🌐 Opening Google OAuth in your browser...\n');
  console.log(`🔗 Auth URL: ${authUrl.toString()}\n`);

  // Try to open browser automatically
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(command, [authUrl.toString()], { stdio: 'ignore' });

  console.log('⏳ Waiting for callback...\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('❌ Port 3333 already in use. Close other processes and try again.');
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});
