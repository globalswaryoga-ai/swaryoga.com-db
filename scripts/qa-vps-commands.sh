#!/bin/bash

#################################################################################
# VPS Quick Commands - Add to qa-whatsapp-aliases.sh
# These are the quick commands that get added to your shell
#################################################################################

# Project root
QA_VPS_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QA_VPS_ENV_FILE="$QA_VPS_PROJECT_ROOT/.env.local"

# Colors
QA_VPS_GREEN='\033[0;32m'
QA_VPS_RED='\033[0;31m'
QA_VPS_YELLOW='\033[1;33m'
QA_VPS_BLUE='\033[0;34m'
QA_VPS_CYAN='\033[0;36m'
QA_VPS_NC='\033[0m'

# Load VPS credentials from .env.local
qa-vps-load-env() {
    if [ ! -f "$QA_VPS_ENV_FILE" ]; then
        echo -e "${QA_VPS_RED}✗ .env.local not found${QA_VPS_NC}"
        return 1
    fi
    
    export QA_VPS_EC2_KEY=$(grep "^EC2_KEY_PATH=" "$QA_VPS_ENV_FILE" | cut -d'=' -f2-)
    export QA_VPS_IP=$(grep "^VPS_IP=" "$QA_VPS_ENV_FILE" | cut -d'=' -f2-)
    export QA_VPS_USER=$(grep "^VPS_USER=" "$QA_VPS_ENV_FILE" | cut -d'=' -f2- || echo "ec2-user")
}

# ============================================================================
# Quick VPS Commands
# ============================================================================

# Full interactive menu
qa-vps-menu() {
    bash "$QA_VPS_PROJECT_ROOT/scripts/qa-vps-manager.sh"
}

# Test SSH connection
qa-vps-test() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}Testing SSH to $QA_VPS_USER@$QA_VPS_IP...${QA_VPS_NC}"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "echo -e '${QA_VPS_GREEN}✓ Connected${QA_VPS_NC}'; whoami; date"
}

# Bridge commands on VPS
qa-vps-bridge-status() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}Bridge status on VPS...${QA_VPS_NC}"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "docker ps | grep wa-bridge || echo 'Not running'; curl -s http://localhost:3333/status | jq . 2>/dev/null || echo 'Bridge not responding'"
}

qa-vps-bridge-start() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}Starting bridge on VPS...${QA_VPS_NC}"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "cd ~/swaryoga/swaryoga.com-db/deploy/wa-bridge && docker compose up -d"
    sleep 10
    qa-vps-bridge-status
}

qa-vps-bridge-stop() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}Stopping bridge on VPS...${QA_VPS_NC}"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "cd ~/swaryoga/swaryoga.com-db/deploy/wa-bridge && docker compose down"
}

qa-vps-bridge-restart() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}Restarting bridge on VPS...${QA_VPS_NC}"
    qa-vps-bridge-stop
    sleep 5
    qa-vps-bridge-start
}

qa-vps-bridge-logs() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}Bridge logs (live, Ctrl+C to exit)...${QA_VPS_NC}\n"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "docker logs wa-bridge -f --tail=50"
}

# VPS system commands
qa-vps-status() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}VPS System Status${QA_VPS_NC}"
    echo ""
    echo -e "${QA_VPS_YELLOW}Uptime:${QA_VPS_NC}"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "uptime"
    echo ""
    echo -e "${QA_VPS_YELLOW}Disk:${QA_VPS_NC}"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "df -h | grep -E '^/dev/|^Filesystem'"
    echo ""
    echo -e "${QA_VPS_YELLOW}Memory:${QA_VPS_NC}"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "free -h"
}

qa-vps-docker-ps() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}Docker containers on VPS${QA_VPS_NC}\n"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP" "docker ps -a"
}

# SSH terminal
qa-vps-ssh() {
    qa-vps-load-env || return 1
    echo -e "${QA_VPS_CYAN}Opening SSH terminal to $QA_VPS_USER@$QA_VPS_IP${QA_VPS_NC}"
    echo -e "${QA_VPS_YELLOW}(Type 'exit' to close)${QA_VPS_NC}\n"
    ssh -i "$QA_VPS_EC2_KEY" "$QA_VPS_USER@$QA_VPS_IP"
}

# EC2 credentials status
qa-vps-info() {
    qa-vps-load-env
    echo -e "${QA_VPS_BLUE}╔════════════════════════════════════════╗${QA_VPS_NC}"
    echo -e "${QA_VPS_BLUE}║  VPS Connection Information            ║${QA_VPS_NC}"
    echo -e "${QA_VPS_BLUE}╚════════════════════════════════════════╝${QA_VPS_NC}\n"
    
    echo -e "${QA_VPS_YELLOW}EC2 Key:${QA_VPS_NC} $QA_VPS_EC2_KEY"
    [ -f "$QA_VPS_EC2_KEY" ] && echo -e "  ${QA_VPS_GREEN}✓ File exists${QA_VPS_NC}" || echo -e "  ${QA_VPS_RED}✗ File not found${QA_VPS_NC}"
    
    echo -e "${QA_VPS_YELLOW}VPS IP:${QA_VPS_NC} $QA_VPS_IP"
    echo -e "${QA_VPS_YELLOW}VPS User:${QA_VPS_NC} $QA_VPS_USER"
    
    echo ""
    echo -e "${QA_VPS_YELLOW}Quick test:${QA_VPS_NC}"
    echo "  qa-vps-test"
}

# Help
qa-vps-help() {
    echo -e "${QA_VPS_BLUE}VPS Management Commands${QA_VPS_NC}\n"
    
    echo -e "${QA_VPS_CYAN}Menu & Setup:${QA_VPS_NC}"
    echo "  qa-vps-menu              Open interactive menu"
    echo "  qa-vps-info              Show VPS connection info"
    echo "  qa-vps-test              Test SSH connection"
    echo ""
    
    echo -e "${QA_VPS_CYAN}Bridge Management:${QA_VPS_NC}"
    echo "  qa-vps-bridge-status     Check bridge status"
    echo "  qa-vps-bridge-start      Start bridge"
    echo "  qa-vps-bridge-stop       Stop bridge"
    echo "  qa-vps-bridge-restart    Restart bridge"
    echo "  qa-vps-bridge-logs       View live logs"
    echo ""
    
    echo -e "${QA_VPS_CYAN}System Management:${QA_VPS_NC}"
    echo "  qa-vps-status            Show system status (uptime, disk, memory)"
    echo "  qa-vps-docker-ps         List Docker containers"
    echo "  qa-vps-ssh               Open SSH terminal"
    echo ""
    
    echo -e "${QA_VPS_CYAN}Setup:${QA_VPS_NC}"
    echo "  Add to .env.local:"
    echo "    EC2_KEY_PATH=/path/to/your/key.pem"
    echo "    VPS_IP=your.vps.ip.address"
    echo "    VPS_USER=ec2-user"
    echo ""
}

echo -e "${QA_VPS_GREEN}✓${QA_VPS_NC} VPS management commands loaded. Type ${QA_VPS_YELLOW}qa-vps-help${QA_VPS_NC} for commands."
