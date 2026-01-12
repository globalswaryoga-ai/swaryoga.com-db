#!/bin/bash

#################################################################################
# WhatsApp QR Integration - Quick Commands
# 
# Add to your ~/.zshrc or ~/.bash_profile:
#   source /path/to/swaryoga.com-db/scripts/qa-whatsapp-aliases.sh
#################################################################################

# Project root
QA_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Color codes
QA_RED='\033[0;31m'
QA_GREEN='\033[0;32m'
QA_YELLOW='\033[1;33m'
QA_BLUE='\033[0;34m'
QA_NC='\033[0m'

# ============================================================================
# Bridge Commands
# ============================================================================

# Check if bridge is running
qa-bridge-status() {
    echo -e "${QA_CYAN}Checking bridge status...${QA_NC}"
    curl -s http://localhost:3333/status | jq . 2>/dev/null || echo "Bridge not responding"
}

# Start local bridge
qa-bridge-start() {
    echo -e "${QA_GREEN}Starting WhatsApp bridge...${QA_NC}"
    cd "$QA_PROJECT_ROOT/deploy/wa-bridge"
    docker compose up -d
    sleep 10
    qa-bridge-status
}

# Stop bridge
qa-bridge-stop() {
    echo -e "${QA_YELLOW}Stopping WhatsApp bridge...${QA_NC}"
    cd "$QA_PROJECT_ROOT/deploy/wa-bridge"
    docker compose down
}

# Restart bridge
qa-bridge-restart() {
    echo -e "${QA_YELLOW}Restarting WhatsApp bridge...${QA_NC}"
    qa-bridge-stop
    sleep 5
    qa-bridge-start
}

# View bridge logs
qa-bridge-logs() {
    docker logs wa-bridge -f --tail=50
}

# ============================================================================
# Development Server Commands
# ============================================================================

# Start dev server on port 3020
qa-dev-start() {
    echo -e "${QA_GREEN}Starting dev server on :3020...${QA_NC}"
    cd "$QA_PROJECT_ROOT"
    npm run dev -- --port 3020
}

# Open QR page in browser
qa-qr-open() {
    echo -e "${QA_GREEN}Opening QR page...${QA_NC}"
    open "http://localhost:3020/admin/crm/qr"
}

# ============================================================================
# Database Commands
# ============================================================================

# Check database connectivity
qa-db-check() {
    echo -e "${QA_YELLOW}Checking database...${QA_NC}"
    cd "$QA_PROJECT_ROOT"
    node -e "
    const { connectDB } = require('./lib/db');
    connectDB().then(() => {
        console.log('✓ Database connected');
        process.exit(0);
    }).catch(err => {
        console.error('✗ Database error:', err.message);
        process.exit(1);
    });
    "
}

# List all whatsapp messages
qa-db-messages() {
    echo -e "${QA_YELLOW}Fetching recent WhatsApp messages...${QA_NC}"
    cd "$QA_PROJECT_ROOT"
    node -e "
    require('dotenv').config({ path: '.env.local' });
    const { connectDB } = require('./lib/db');
    const { getWhatsAppMessage } = require('./lib/schemas/enterpriseSchemas');
    
    (async () => {
        try {
            await connectDB();
            const WhatsAppMessage = getWhatsAppMessage();
            const messages = await WhatsAppMessage.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
            console.log(JSON.stringify(messages, null, 2));
        } catch (err) {
            console.error('Error:', err.message);
        }
        process.exit(0);
    })();
    "
}

# List all leads
qa-db-leads() {
    echo -e "${QA_YELLOW}Fetching recent leads...${QA_NC}"
    cd "$QA_PROJECT_ROOT"
    node -e "
    require('dotenv').config({ path: '.env.local' });
    const { connectDB } = require('./lib/db');
    const { getLead } = require('./lib/schemas/enterpriseSchemas');
    
    (async () => {
        try {
            await connectDB();
            const Lead = getLead();
            const leads = await Lead.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .select('phoneNumber name assignedToUserId status')
                .lean();
            console.log(JSON.stringify(leads, null, 2));
        } catch (err) {
            console.error('Error:', err.message);
        }
        process.exit(0);
    })();
    "
}

# ============================================================================
# Diagnostics Commands
# ============================================================================

# Full system check
qa-diagnose() {
    echo -e "${QA_BLUE}╔════════════════════════════════════════╗${QA_NC}"
    echo -e "${QA_BLUE}║  WhatsApp QR - Full Diagnostics        ║${QA_NC}"
    echo -e "${QA_BLUE}╚════════════════════════════════════════╝${QA_NC}\n"
    
    echo -e "${QA_YELLOW}1. System Info${QA_NC}"
    echo "   macOS: $(sw_vers -productVersion)"
    echo "   Node: $(node --version 2>/dev/null || echo 'N/A')"
    echo "   npm: $(npm --version 2>/dev/null || echo 'N/A')"
    echo "   Docker: $(docker --version 2>/dev/null | grep -o 'Docker.*' || echo 'N/A')"
    echo ""
    
    echo -e "${QA_YELLOW}2. Project Files${QA_NC}"
    [ -f "$QA_PROJECT_ROOT/app/admin/crm/qr/page.tsx" ] && echo "   ✓ QR Page" || echo "   ✗ QR Page"
    [ -f "$QA_PROJECT_ROOT/deploy/wa-bridge/docker-compose.yml" ] && echo "   ✓ Bridge Config" || echo "   ✗ Bridge Config"
    [ -f "$QA_PROJECT_ROOT/.env.local" ] && echo "   ✓ .env.local" || echo "   ✗ .env.local"
    echo ""
    
    echo -e "${QA_YELLOW}3. Services${QA_NC}"
    if curl -s http://localhost:3333/status > /dev/null 2>&1; then
        echo -e "   ${QA_GREEN}✓${QA_NC} Local Bridge (127.0.0.1:3333)"
    else
        echo -e "   ${QA_RED}✗${QA_NC} Local Bridge (127.0.0.1:3333)"
    fi
    
    if curl -s http://localhost:3020 > /dev/null 2>&1; then
        echo -e "   ${QA_GREEN}✓${QA_NC} Dev Server (localhost:3020)"
    else
        echo -e "   ${QA_RED}✗${QA_NC} Dev Server (localhost:3020)"
    fi
    
    if curl -s https://wa-bridge.swaryoga.com/status > /dev/null 2>&1; then
        echo -e "   ${QA_GREEN}✓${QA_NC} VPS Bridge (wa-bridge.swaryoga.com)"
    else
        echo -e "   ${QA_YELLOW}○${QA_NC} VPS Bridge (wa-bridge.swaryoga.com)"
    fi
    echo ""
}

# Test the full flow
qa-test-flow() {
    echo -e "${QA_BLUE}Testing full WhatsApp flow...${QA_NC}\n"
    
    echo -e "${QA_YELLOW}1. Bridge Status${QA_NC}"
    if curl -s http://localhost:3333/status | jq -e '.status' > /dev/null 2>&1; then
        local status=$(curl -s http://localhost:3333/status | jq -r '.status')
        echo -e "   Status: $status"
    else
        echo -e "   ${QA_RED}Bridge not running${QA_NC}"
        return 1
    fi
    echo ""
    
    echo -e "${QA_YELLOW}2. QR Page Accessible${QA_NC}"
    if curl -s http://localhost:3020/admin/crm/qr | grep -q "QRWhatsAppInboxPage" 2>/dev/null; then
        echo -e "   ${QA_GREEN}✓${QA_NC} QR page loaded"
    else
        echo -e "   ${QA_YELLOW}Note:${QA_NC} Start dev server: qa-dev-start"
    fi
    echo ""
    
    echo -e "${QA_YELLOW}Next steps:${QA_NC}"
    echo "   1. Open: http://localhost:3020/admin/crm/qr"
    echo "   2. Scan QR code with WhatsApp → Linked Devices"
    echo "   3. Wait for bridge status to show 'connected'"
    echo "   4. Test send/receive messages"
    echo ""
}

# ============================================================================
# Setup & Config Commands
# ============================================================================

# Run full setup wizard
qa-setup() {
    bash "$QA_PROJECT_ROOT/scripts/qa-whatsapp-setup.sh"
}

# Edit bridge config
qa-config-bridge() {
    echo -e "${QA_YELLOW}Opening bridge .env...${QA_NC}"
    $EDITOR "$QA_PROJECT_ROOT/deploy/wa-bridge/.env"
}

# Edit app config
qa-config-app() {
    echo -e "${QA_YELLOW}Opening app .env.local...${QA_NC}"
    $EDITOR "$QA_PROJECT_ROOT/.env.local"
}

# ============================================================================
# Utility Commands
# ============================================================================

# Show all available commands
qa-help() {
    echo -e "${QA_BLUE}WhatsApp QR Integration - Available Commands${QA_NC}\n"
    
    echo -e "${QA_YELLOW}Bridge Commands:${QA_NC}"
    echo "  qa-bridge-status         Show bridge status"
    echo "  qa-bridge-start          Start local bridge"
    echo "  qa-bridge-stop           Stop bridge"
    echo "  qa-bridge-restart        Restart bridge"
    echo "  qa-bridge-logs           View bridge logs (live)"
    echo ""
    
    echo -e "${QA_YELLOW}Dev Server:${QA_NC}"
    echo "  qa-dev-start             Start dev server on :3020"
    echo "  qa-qr-open               Open QR page in browser"
    echo ""
    
    echo -e "${QA_YELLOW}Database:${QA_NC}"
    echo "  qa-db-check              Check database connectivity"
    echo "  qa-db-messages           List recent WhatsApp messages"
    echo "  qa-db-leads              List recent leads"
    echo ""
    
    echo -e "${QA_YELLOW}Diagnostics:${QA_NC}"
    echo "  qa-diagnose              Full system diagnostics"
    echo "  qa-test-flow             Test the complete flow"
    echo ""
    
    echo -e "${QA_YELLOW}Setup:${QA_NC}"
    echo "  qa-setup                 Run interactive setup wizard"
    echo "  qa-config-bridge         Edit bridge .env"
    echo "  qa-config-app            Edit app .env.local"
    echo ""
    
    echo -e "${QA_YELLOW}Help:${QA_NC}"
    echo "  qa-help                  Show this help message"
    echo ""
}

# Set up color variable
QA_CYAN='\033[0;36m'

echo -e "${QA_GREEN}✓${QA_NC} WhatsApp QR aliases loaded. Type ${QA_YELLOW}qa-help${QA_NC} for commands."
