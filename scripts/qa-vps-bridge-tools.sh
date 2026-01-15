#!/bin/bash

# ============================================================================
# Swar Yoga VPS Bridge Tools
# Specialized for the remote PM2-based WhatsApp Bridge on EC2
# ============================================================================

# Configuration
VPS_IP="3.109.154.61"
VPS_USER="ubuntu"
VPS_KEY=""
# Try to find the correct key
if [ -f "/Users/mohankalburgi/.ssh/swar-yoga-bridge-key2.pem" ]; then
    VPS_KEY="/Users/mohankalburgi/.ssh/swar-yoga-bridge-key2.pem"
elif [ -f "/Users/mohankalburgi/.ssh/swar-yoga-bridge-key.pem" ]; then
    VPS_KEY="/Users/mohankalburgi/.ssh/swar-yoga-bridge-key.pem"
else
    echo -e "\033[0;31m✗ No SSH key found in ~/.ssh/ (checked swar-yoga-bridge-key.pem and key2.pem)\033[0m"
fi
BRIDGE_DIR="~/swaryoga.com-db/services/whatsapp-web"
BRIDGE_SECRET="swar-bridge-secret-2024"

# Colors
CLR_GREEN='\033[0;32m'
CLR_RED='\033[0;31m'
CLR_YELLOW='\033[1;33m'
CLR_CYAN='\033[0;36m'
CLR_NC='\033[0m'

# Helpers
vps_ssh() {
    ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -i "$VPS_KEY" "$VPS_USER@$VPS_IP" "$1"
}

# --- Action Commands ---

# 1. Full Deep Recovery (Fixes ENOSPC, Stuck Updates, and PM2)
qa-vps-recover() {
    echo -e "${CLR_CYAN}Starting DEEP RECOVERY on VPS ($VPS_IP)...${CLR_NC}"
    echo -e "${CLR_YELLOW}This will kill stuck processes, clear cache, and reinstall dependencies.${CLR_NC}"
    
    vps_ssh "
        echo '--- 1. Stopping unattended upgrades and killing stuck apt/dpkg ---';
        sudo systemctl stop unattended-upgrades || true;
        sudo pkill -9 -f 'apt-get' || true;
        sudo pkill -9 -f 'dpkg' || true;
        sudo rm -f /var/lib/apt/lists/lock /var/cache/apt/archives/lock /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock;
        sudo dpkg --configure -a;

        echo '--- 2. Clearing Disk Space ---';
        sudo apt-get clean;
        sudo journalctl --vacuum-time=1d;
        sudo rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* ~/.cache/puppeteer ~/.npm $BRIDGE_DIR/node_modules;
        df -h /;

        echo '--- 3. Reinstalling Dependencies (Skipping Browser Download) ---';
        cd $BRIDGE_DIR && PUPPETEER_SKIP_DOWNLOAD=1 npm install --production;

        echo '--- 4. Restarting PM2 Process ---';
        pm2 restart wa-bridge --update-env || pm2 start index.js --name wa-bridge;
        
        echo '--- 5. Verification ---';
        pm2 status;
        curl -sS -H 'X-Bridge-Secret: $BRIDGE_SECRET' http://localhost:3333/status;
    "
    
    echo -e "${CLR_GREEN}Deep recovery attempt finished.${CLR_NC}"
}

# 2. Check VPS Status
qa-vps-status() {
    echo -e "${CLR_CYAN}Checking VPS Health & Bridge Status...${CLR_NC}"
    vps_ssh "
        echo -e '${CLR_YELLOW}System Info:${CLR_NC}' && uptime && df -h /;
        echo -e '\n${CLR_YELLOW}PM2 status:${CLR_NC}';
        pm2 status wa-bridge;
        echo -e '\n${CLR_YELLOW}Bridge Internal Port:${CLR_NC}';
        sudo ss -lntp | grep :3333 || echo 'Port 3333 NOT LISTENING';
        echo -e '\n${CLR_YELLOW}API Response:${CLR_NC}';
        curl -sS -H 'X-Bridge-Secret: $BRIDGE_SECRET' http://localhost:3333/status || echo 'Bridge API NOT RESPONDING';
    "
}

# 3. View Remote Logs
qa-vps-logs() {
    echo -e "${CLR_CYAN}Streaming logs from VPS (Ctrl+C to quit)...${CLR_NC}"
    vps_ssh "pm2 logs wa-bridge --lines 50"
}

# 4. Standard Restart
qa-vps-restart() {
    echo -e "${CLR_CYAN}Restarting wa-bridge on VPS...${CLR_NC}"
    vps_ssh "pm2 restart wa-bridge"
}

# 5. Connect SSH Shell
qa-vps-shell() {
    echo -e "${CLR_CYAN}Connecting to VPS shell...${CLR_NC}"
    ssh -i "$VPS_KEY" "$VPS_USER@$VPS_IP"
}

# --- Help ---
qa-vps-help() {
    echo -e "${CLR_CYAN}=== Swar Yoga VPS Bridge Commands ===${CLR_NC}"
    echo -e "  ${CLR_YELLOW}qa-vps-recover${CLR_NC}  : Full deep fix (Use if QR is not working/Disk is full)"
    echo -e "  ${CLR_YELLOW}qa-vps-status${CLR_NC}   : Quick health check of Disk, PM2, and API"
    echo -e "  ${CLR_YELLOW}qa-vps-logs${CLR_NC}     : View live logs from the remote bridge"
    echo -e "  ${CLR_YELLOW}qa-vps-restart${CLR_NC}  : Simple restart of the wa-bridge process"
    echo -e "  ${CLR_YELLOW}qa-vps-shell${CLR_NC}    : Open a direct SSH terminal session"
    echo -e "======================================"
}

# Auto-show help when sourced
qa-vps-help
