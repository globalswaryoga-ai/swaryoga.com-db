#!/bin/bash

# WhatsApp Web Bridge - Quick Start Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🚀 Swar Yoga - WhatsApp Web Bridge Setup              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$SCRIPT_DIR/services/whatsapp-web"

# Check if services/whatsapp-web exists
if [ ! -d "$WEB_DIR" ]; then
    echo "❌ Error: services/whatsapp-web directory not found"
    echo "   Expected at: $WEB_DIR"
    exit 1
fi

echo "📁 Working directory: $WEB_DIR"
echo ""

# Step 1: Check Node.js
echo "🔍 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 14+ first."
    echo "   Download from: https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "✅ Node.js $NODE_VERSION found"
echo ""

# Step 2: Check .env file
echo "🔍 Checking environment configuration..."
if [ ! -f "$WEB_DIR/.env" ]; then
    echo "📝 Creating .env file..."
    cat > "$WEB_DIR/.env" << EOF
# WhatsApp Web Bridge Configuration
WHATSAPP_CLIENT_ID=crm-whatsapp-session
WHATSAPP_WEB_PORT=3333
WHATSAPP_WEB_BRIDGE_SECRET=your-secret-key-change-me
EOF
    echo "✅ .env file created at: $WEB_DIR/.env"
    echo "   ⚠️  Please update WHATSAPP_WEB_BRIDGE_SECRET for security"
else
    echo "✅ .env file already exists"
fi
echo ""

# Step 3: Install dependencies
echo "📦 Installing dependencies..."
cd "$WEB_DIR"

if [ -d "node_modules" ]; then
    echo "✅ Dependencies already installed"
else
    echo "⏳ Running: npm install"
    npm install --production
    if [ $? -ne 0 ]; then
        echo "❌ npm install failed"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
fi
echo ""

# Step 4: Check for Chrome/Chromium
echo "🔍 Checking for Chrome/Chromium..."
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome found"
elif command -v chromium &> /dev/null; then
    echo "✅ Chromium found"
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium Browser found"
else
    echo "⚠️  Chrome/Chromium not found"
    echo "   whatsapp-web.js uses Puppeteer which will auto-download Chromium"
    echo "   This requires ~500MB disk space and internet connection"
fi
echo ""

# Step 5: Show startup information
echo "════════════════════════════════════════════════════════════"
echo "✅ Setup complete! Ready to start WhatsApp Web Bridge"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  Start the WhatsApp Web Bridge service:"
echo "    cd services/whatsapp-web"
echo "    npm start"
echo ""
echo "2️⃣  The service will start on:"
echo "    🌐 HTTP:      http://localhost:3333"
echo "    📱 WebSocket: ws://localhost:3333"
echo ""
echo "3️⃣  In your main app, ensure .env has:"
echo "    NEXT_PUBLIC_WHATSAPP_WEB_WS=ws://localhost:3333"
echo ""
echo "4️⃣  Open your CRM and click the 📱 WhatsApp Web button"
echo ""
echo "5️⃣  Scan the QR code with WhatsApp on your phone"
echo "    Settings → Linked Devices → Link a Device"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📚 For detailed help, see:"
echo "   WHATSAPP_WEB_QR_SETUP.md"
echo ""
echo "🆘 Troubleshooting:"
echo "   • Port in use?     lsof -ti:3333 | xargs kill -9"
echo "   • View logs?       npm start > debug.log 2>&1"
echo "   • Clear session?   rm -rf .wwebjs_auth"
echo ""
echo "Ready? Run: npm start"
echo ""
