# WhatsApp Web bridge image
# Notes:
# - whatsapp-web.js uses puppeteer/Chromium.
# - This image includes Chromium deps; deploy behind a reverse proxy for HTTPS/WSS.

FROM node:20-bookworm-slim

# Install Chromium + required libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libu2f-udev \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production
ENV WHATSAPP_WEB_PORT=3333

EXPOSE 3333

# Ensure puppeteer uses system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["node", "qrServer.js"]
