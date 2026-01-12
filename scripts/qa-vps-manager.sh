#!/bin/bash

#################################################################################
# VPS Management via EC2 - macOS Terminal
# 
# Manage your WhatsApp bridge VPS from your Mac using SSH and EC2 keys
# 
# Setup:
# 1. Export EC2_KEY_PATH and VPS_IP in your .env.local
# 2. Run: qa-vps-help
#################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"

# Load environment variables
load_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}✗ .env.local not found at $ENV_FILE${NC}"
        return 1
    fi
    
    # Load EC2 credentials from .env.local
    export EC2_KEY_PATH=$(grep "^EC2_KEY_PATH=" "$ENV_FILE" | cut -d'=' -f2-)
    export VPS_IP=$(grep "^VPS_IP=" "$ENV_FILE" | cut -d'=' -f2-)
    export VPS_USER=$(grep "^VPS_USER=" "$ENV_FILE" | cut -d'=' -f2- || echo "ec2-user")
    export VPS_SSH_PORT=$(grep "^VPS_SSH_PORT=" "$ENV_FILE" | cut -d'=' -f2- || echo "22")
    export VPS_BRIDGE_DIR=$(grep "^VPS_BRIDGE_DIR=" "$ENV_FILE" | cut -d'=' -f2- || echo "~/swaryoga/swaryoga.com-db/deploy/wa-bridge")
}

# Validate EC2 credentials
validate_credentials() {
    if [ -z "$EC2_KEY_PATH" ]; then
        echo -e "${RED}✗ EC2_KEY_PATH not set in .env.local${NC}"
        return 1
    fi
    
    if [ ! -f "$EC2_KEY_PATH" ]; then
        echo -e "${RED}✗ EC2 key file not found: $EC2_KEY_PATH${NC}"
        return 1
    fi
    
    # Check permissions
    local perms=$(stat -f %OLp "$EC2_KEY_PATH" 2>/dev/null | tail -c 4)
    if [ "$perms" != "0600" ] && [ "$perms" != "0400" ]; then
        echo -e "${YELLOW}⚠ EC2 key has unusual permissions: $perms${NC}"
        echo -e "${YELLOW}Fixing to 600...${NC}"
        chmod 600 "$EC2_KEY_PATH"
    fi
    
    if [ -z "$VPS_IP" ]; then
        echo -e "${RED}✗ VPS_IP not set in .env.local${NC}"
        return 1
    fi
    
    return 0
}

# SSH command wrapper
vps_ssh() {
    ssh -i "$EC2_KEY_PATH" -p "$VPS_SSH_PORT" "$VPS_USER@$VPS_IP" "$@"
}

# SCP command wrapper
vps_scp() {
    scp -i "$EC2_KEY_PATH" -P "$VPS_SSH_PORT" "$@"
}

# Menu
show_menu() {
    echo -e "${CYAN}VPS Management Menu:${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}. Test SSH Connection"
    echo -e "  ${GREEN}2${NC}. Show VPS Status"
    echo -e "  ${GREEN}3${NC}. Check Bridge Status (on VPS)"
    echo -e "  ${GREEN}4${NC}. Start Bridge on VPS"
    echo -e "  ${GREEN}5${NC}. Stop Bridge on VPS"
    echo -e "  ${GREEN}6${NC}. Restart Bridge on VPS"
    echo -e "  ${GREEN}7${NC}. View Bridge Logs (on VPS)"
    echo -e "  ${GREEN}8${NC}. Check Disk Space"
    echo -e "  ${GREEN}9${NC}. Check Memory/CPU"
    echo -e "  ${GREEN}10${NC}. Check Docker Status"
    echo -e "  ${GREEN}11${NC}. Check Nginx Status"
    echo -e "  ${GREEN}12${NC}. Show .env Configuration"
    echo -e "  ${GREEN}13${NC}. Edit Bridge .env (remote)"
    echo -e "  ${GREEN}14${NC}. Download Bridge Logs"
    echo -e "  ${GREEN}15${NC}. Restart VPS Services"
    echo -e "  ${GREEN}16${NC}. Open SSH Terminal"
    echo -e "  ${GREEN}17${NC}. Show EC2 Credentials Status"
    echo -e "  ${GREEN}0${NC}. Exit"
    echo ""
}

# 1. Test SSH Connection
test_ssh() {
    echo -e "${CYAN}═══ Testing SSH Connection ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Connecting to $VPS_USER@$VPS_IP:$VPS_SSH_PORT...${NC}"
    
    if vps_ssh "echo 'SSH connection successful!'"; then
        echo -e "\n${GREEN}✓ SSH connection works${NC}"
        return 0
    else
        echo -e "\n${RED}✗ SSH connection failed${NC}"
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo "  1. Check EC2_KEY_PATH: $EC2_KEY_PATH"
        echo "  2. Check VPS_IP: $VPS_IP"
        echo "  3. Check VPS_USER: $VPS_USER"
        echo "  4. Check VPS_SSH_PORT: $VPS_SSH_PORT"
        echo "  5. Ensure key permissions are 600: chmod 600 $EC2_KEY_PATH"
        return 1
    fi
}

# 2. Show VPS Status
show_vps_status() {
    echo -e "${CYAN}═══ VPS System Status ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Uptime:${NC}"
    vps_ssh "uptime"
    
    echo ""
    echo -e "${YELLOW}OS Info:${NC}"
    vps_ssh "uname -a"
    
    echo ""
    echo -e "${YELLOW}Current User:${NC}"
    vps_ssh "whoami"
    
    echo ""
}

# 3. Check Bridge Status
check_bridge_status() {
    echo -e "${CYAN}═══ Bridge Status on VPS ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Docker containers:${NC}"
    vps_ssh "docker ps | grep wa-bridge || echo 'No wa-bridge container found'"
    
    echo ""
    echo -e "${YELLOW}Bridge health check (curl):${NC}"
    vps_ssh "curl -s http://localhost:3333/status | jq . 2>/dev/null || echo 'Bridge not accessible'"
    
    echo ""
}

# 4. Start Bridge
start_bridge() {
    echo -e "${CYAN}═══ Starting Bridge on VPS ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Starting bridge...${NC}"
    vps_ssh "cd $VPS_BRIDGE_DIR && docker compose up -d"
    
    echo ""
    echo -e "${YELLOW}Waiting 15 seconds for initialization...${NC}"
    sleep 15
    
    check_bridge_status
}

# 5. Stop Bridge
stop_bridge() {
    echo -e "${CYAN}═══ Stopping Bridge on VPS ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Stopping bridge...${NC}"
    vps_ssh "cd $VPS_BRIDGE_DIR && docker compose down"
    
    echo -e "\n${GREEN}✓ Bridge stopped${NC}"
}

# 6. Restart Bridge
restart_bridge() {
    echo -e "${CYAN}═══ Restarting Bridge on VPS ═══${NC}\n"
    
    stop_bridge
    sleep 5
    start_bridge
}

# 7. View Bridge Logs
view_logs() {
    echo -e "${CYAN}═══ Bridge Logs (Last 50 lines) ═══${NC}\n"
    echo -e "(Press Ctrl+C to exit)\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    vps_ssh "docker logs wa-bridge -f --tail=50" || echo "Could not fetch logs"
}

# 8. Check Disk Space
check_disk() {
    echo -e "${CYAN}═══ Disk Space ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    vps_ssh "df -h"
    
    echo ""
    echo -e "${YELLOW}Docker disk usage:${NC}"
    vps_ssh "docker system df"
}

# 9. Check Memory/CPU
check_resources() {
    echo -e "${CYAN}═══ Memory & CPU Usage ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    vps_ssh "free -h"
    
    echo ""
    vps_ssh "top -b -n 1 | head -15"
}

# 10. Check Docker Status
check_docker() {
    echo -e "${CYAN}═══ Docker Status ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Docker version:${NC}"
    vps_ssh "docker --version"
    
    echo ""
    echo -e "${YELLOW}Docker daemon status:${NC}"
    vps_ssh "systemctl status docker --no-pager || echo 'systemctl not available'"
    
    echo ""
    echo -e "${YELLOW}Running containers:${NC}"
    vps_ssh "docker ps"
    
    echo ""
    echo -e "${YELLOW}All containers:${NC}"
    vps_ssh "docker ps -a"
}

# 11. Check Nginx Status
check_nginx() {
    echo -e "${CYAN}═══ Nginx Status ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Nginx status:${NC}"
    vps_ssh "systemctl status nginx --no-pager || echo 'systemctl not available'"
    
    echo ""
    echo -e "${YELLOW}Nginx config test:${NC}"
    vps_ssh "sudo nginx -t 2>&1 || echo 'Permission denied or nginx not found'"
    
    echo ""
    echo -e "${YELLOW}Nginx process:${NC}"
    vps_ssh "ps aux | grep nginx | grep -v grep || echo 'No nginx process found'"
}

# 12. Show Bridge .env
show_env() {
    echo -e "${CYAN}═══ Bridge .env Configuration ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Contents of $VPS_BRIDGE_DIR/.env:${NC}"
    vps_ssh "cat $VPS_BRIDGE_DIR/.env"
}

# 13. Edit Bridge .env
edit_env() {
    echo -e "${CYAN}═══ Edit Bridge .env ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}Opening nano editor on VPS...${NC}"
    echo -e "(Type Ctrl+X to save and exit)\n"
    
    vps_ssh "nano $VPS_BRIDGE_DIR/.env"
    
    echo ""
    echo -e "${GREEN}✓ File saved${NC}"
    echo ""
    echo -e "${YELLOW}You need to restart the bridge for changes to take effect:${NC}"
    echo "  Run: qa-vps-restart-bridge"
}

# 14. Download Bridge Logs
download_logs() {
    echo -e "${CYAN}═══ Download Bridge Logs ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    local local_dir="$PROJECT_ROOT/vps-logs"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local log_file="$local_dir/bridge-logs_$timestamp.txt"
    
    mkdir -p "$local_dir"
    
    echo -e "${YELLOW}Downloading logs to: $log_file${NC}"
    
    if vps_ssh "docker logs wa-bridge" > "$log_file" 2>&1; then
        echo -e "${GREEN}✓ Logs downloaded${NC}"
        echo -e "${YELLOW}File size: $(du -h "$log_file" | cut -f1)${NC}"
        echo -e "${YELLOW}File: $log_file${NC}"
    else
        echo -e "${RED}✗ Failed to download logs${NC}"
    fi
}

# 15. Restart VPS Services
restart_services() {
    echo -e "${CYAN}═══ Restart VPS Services ═══${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    echo -e "${YELLOW}1. Restarting Docker...${NC}"
    vps_ssh "sudo systemctl restart docker" || echo "Docker restart skipped"
    sleep 5
    
    echo -e "${YELLOW}2. Restarting Nginx...${NC}"
    vps_ssh "sudo systemctl reload nginx" || echo "Nginx reload skipped"
    sleep 5
    
    echo -e "${YELLOW}3. Restarting Bridge...${NC}"
    vps_ssh "cd $VPS_BRIDGE_DIR && docker compose restart wa-bridge"
    
    sleep 10
    
    echo -e "\n${YELLOW}Checking status...${NC}"
    check_bridge_status
}

# 16. Open SSH Terminal
open_ssh_terminal() {
    echo -e "${CYAN}═══ Opening SSH Terminal ═══${NC}\n"
    echo -e "${YELLOW}Connecting to $VPS_USER@$VPS_IP...${NC}"
    echo -e "${YELLOW}(Type 'exit' to close terminal)${NC}\n"
    
    if ! validate_credentials; then
        return 1
    fi
    
    ssh -i "$EC2_KEY_PATH" -p "$VPS_SSH_PORT" "$VPS_USER@$VPS_IP"
}

# 17. Show EC2 Credentials Status
show_credentials_status() {
    echo -e "${CYAN}═══ EC2 Credentials Status ═══${NC}\n"
    
    load_env
    
    echo -e "${YELLOW}EC2_KEY_PATH:${NC}"
    if [ -z "$EC2_KEY_PATH" ]; then
        echo -e "  ${RED}✗ Not set${NC}"
    elif [ -f "$EC2_KEY_PATH" ]; then
        echo -e "  ${GREEN}✓ $EC2_KEY_PATH${NC}"
        local perms=$(stat -f %OLp "$EC2_KEY_PATH" 2>/dev/null | tail -c 4)
        echo -e "  Permissions: $perms"
    else
        echo -e "  ${RED}✗ File not found: $EC2_KEY_PATH${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}VPS_IP:${NC}"
    if [ -z "$VPS_IP" ]; then
        echo -e "  ${RED}✗ Not set${NC}"
    else
        echo -e "  ${GREEN}✓ $VPS_IP${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}VPS_USER:${NC}"
    if [ -z "$VPS_USER" ]; then
        echo -e "  ${YELLOW}○ Using default: ec2-user${NC}"
    else
        echo -e "  ${GREEN}✓ $VPS_USER${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}VPS_SSH_PORT:${NC}"
    if [ -z "$VPS_SSH_PORT" ]; then
        echo -e "  ${YELLOW}○ Using default: 22${NC}"
    else
        echo -e "  ${GREEN}✓ $VPS_SSH_PORT${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}VPS_BRIDGE_DIR:${NC}"
    if [ -z "$VPS_BRIDGE_DIR" ]; then
        echo -e "  ${YELLOW}○ Using default: ~/swaryoga/swaryoga.com-db/deploy/wa-bridge${NC}"
    else
        echo -e "  ${GREEN}✓ $VPS_BRIDGE_DIR${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}Configuration location:${NC}"
    echo -e "  ${BLUE}$ENV_FILE${NC}"
    
    echo ""
    echo -e "${YELLOW}Test connection:${NC}"
    echo -e "  qa-vps-test (or option 1 from menu)"
}

# Main loop
main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  VPS Management via EC2 - macOS Terminal                       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
    
    # Load environment first
    if ! load_env; then
        echo -e "\n${YELLOW}Setup required. Add to .env.local:${NC}"
        cat << 'ENVTEMP'

# EC2/VPS Configuration
EC2_KEY_PATH=/path/to/your/key.pem
VPS_IP=your.vps.ip.address
VPS_USER=ec2-user
VPS_SSH_PORT=22
VPS_BRIDGE_DIR=~/swaryoga/swaryoga.com-db/deploy/wa-bridge

ENVTEMP
        return 1
    fi
    
    while true; do
        show_menu
        read -p "$(echo -e ${YELLOW}Enter choice:${NC} )" choice
        echo ""
        
        case $choice in
            1) test_ssh ;;
            2) show_vps_status ;;
            3) check_bridge_status ;;
            4) start_bridge ;;
            5) stop_bridge ;;
            6) restart_bridge ;;
            7) view_logs ;;
            8) check_disk ;;
            9) check_resources ;;
            10) check_docker ;;
            11) check_nginx ;;
            12) show_env ;;
            13) edit_env ;;
            14) download_logs ;;
            15) restart_services ;;
            16) open_ssh_terminal ;;
            17) show_credentials_status ;;
            0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac
        
        echo ""
        read -p "$(echo -e ${CYAN}Press Enter to continue...${NC})"
        clear
    done
}

# Run if called directly
main "$@"
