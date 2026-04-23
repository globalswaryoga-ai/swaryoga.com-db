# Zoom Bot Deployment (EC2)

This bot runs on your EC2 instance and uses Puppeteer + Chromium to:
1. Open Zoom Web Client as a participant named "Swar Sadhana"
2. Send countdown chat messages (3 minutes)
3. Open Bunny video in a second tab for screen share
4. Auto-leave after configured duration

## One-Time EC2 Setup

SSH into your EC2 (13.62.126.213):

```bash
ssh -i wa-bridge-key.pem ubuntu@13.62.126.213
```

Install Chromium dependencies:

```bash
sudo apt update
sudo apt install -y chromium-browser xvfb libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
```

Install Node.js 20 if not already:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## Deploy Bot Code

From your local machine:

```bash
scp -i wa-bridge-key.pem -r deploy/zoom-bot ubuntu@13.62.126.213:~/
```

On EC2:

```bash
cd ~/zoom-bot
npm install
```

Create `.env`:

```bash
cat > .env <<EOF
PORT=3400
ZOOM_BOT_SECRET=swar-zoom-bot-secret-2024
ZOOM_BOT_DISPLAY_NAME=Swar Sadhana
EOF
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Open Firewall Port 3400

In AWS Console → EC2 → Security Groups → Edit inbound rules:
- Add rule: Custom TCP, port 3400, source 0.0.0.0/0

## Test

```bash
curl http://13.62.126.213:3400/health
```

Should return `{"status":"ok"}`.

## Trigger Bot from Vercel

Add these to Vercel environment variables:

```
ZOOM_BOT_EC2_URL=http://13.62.126.213:3400
ZOOM_BOT_SECRET=swar-zoom-bot-secret-2024
```

The Vercel cron will POST to `${ZOOM_BOT_EC2_URL}/start-meeting` at scheduled times.
