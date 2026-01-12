#!/bin/bash

#################################################################################
# WhatsApp QR Integration Setup & Diagnostics for macOS
# 
# This script helps you:
# 1. Check bridge status (VPS)
# 2. Setup local development bridge
# 3. Configure environment variables
# 4. Run diagnostics
# 5. Test the full flow
#################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRIDGE_DIR="$PROJECT_ROOT/deploy/wa-bridge"
BRIDGE_ENV="$BRIDGE_DIR/.env"
APP_ENV="$PROJECT_ROOT/.env.local"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  WhatsApp QR Integration - Setup & Diagnostics (macOS)         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"

# Menu
show_menu() {
    echo -e "${CYAN}Select an option:${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}. Check Bridge Status (VPS)"
    echo -e "  ${GREEN}2${NC}. Setup Local Development Bridge"
    echo -e "  ${GREEN}3${NC}. Configure Environment Variables"
    echo -e "  ${GREEN}4${NC}. Run Full Diagnostics"
    echo -e "  ${GREEN}5${NC}. Test Send/Receive Flow"
    echo -e "  ${GREEN}6${NC}. View Bridge Logs"
    echo -e "  ${GREEN}7${NC}. Restart Bridge Services"
    echo -e "  ${GREEN}8${NC}. Generate QR Code"
    echo -e "  ${GREEN}9${NC}. Create Database Backup"
    echo -e "  ${GREEN}10${NC}. Test Webhook Events"
    echo -e "  ${GREEN}0${NC}. Exit"
    echo ""
}

# 1. Check Bridge Status
check_bridge_status() {
    echo -e "${CYAN}═══ Bridge Status Check ═══${NC}\n"
    
    local bridge_url="https://wa-bridge.swaryoga.com"
    local local_bridge="http://localhost:3333"
    
    echo -e "${YELLOW}Checking VPS Bridge:${NC} $bridge_url"
    if curl -s -o /dev/null -w "%{http_code}" "$bridge_url/status" > /tmp/bridge_status.txt 2>&1; then
        local status_code=$(cat /tmp/bridge_status.txt)
        if [ "$status_code" = "200" ]; then
            echo -e "${GREEN}✓ VPS Bridge is online${NC}"
            curl -s "$bridge_url/status" | jq . 2>/dev/null || echo "Could not parse response"
        else
            echo -e "${RED}✗ VPS Bridge returned HTTP $status_code${NC}"
        fi
    else
        echo -e "${RED}✗ VPS Bridge unreachable${NC}"
        echo -e "${YELLOW}Check networking:${NC}"
        echo "  1. Is VPS IP accessible from macOS?"
        echo "  2. Is Nginx running on VPS?"
        echo "  3. Are TLS certs valid?"
    fi
    
    echo ""
    echo -e "${YELLOW}Checking Local Bridge:${NC} $local_bridge"
    if curl -s -o /dev/null -w "%{http_code}" "$local_bridge/status" > /tmp/local_bridge_status.txt 2>&1; then
        local status_code=$(cat /tmp/local_bridge_status.txt)
        if [ "$status_code" = "200" ]; then
            echo -e "${GREEN}✓ Local Bridge is online${NC}"
            curl -s "$local_bridge/status" | jq . 2>/dev/null || echo "Could not parse response"
        else
            echo -e "${YELLOW}Local Bridge returned HTTP $status_code${NC}"
        fi
    else
        echo -e "${YELLOW}Local Bridge not running${NC}"
    fi
    
    echo ""
}

# 2. Setup Local Development Bridge
setup_local_bridge() {
    echo -e "${CYAN}═══ Setup Local Development Bridge ═══${NC}\n"
    
    echo -e "${YELLOW}Prerequisites:${NC}"
    echo "  • Docker Desktop running"
    echo "  • Node.js 18+ installed"
    echo ""
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker not found. Install Docker Desktop for Mac:${NC}"
        echo "  https://docs.docker.com/desktop/install/mac-install/"
        return 1
    fi
    echo -e "${GREEN}✓ Docker is installed${NC}"
    
    # Check Docker running
    if ! docker ps > /dev/null 2>&1; then
        echo -e "${RED}✗ Docker daemon not running${NC}"
        echo -e "${YELLOW}Start Docker Desktop and try again${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ Docker daemon is running${NC}"
    
    # Check bridge directory
    if [ ! -d "$BRIDGE_DIR" ]; then
        echo -e "${RED}✗ Bridge directory not found: $BRIDGE_DIR${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ Bridge directory found${NC}"
    
    # Check/create .env file
    if [ ! -f "$BRIDGE_ENV" ]; then
        echo -e "${YELLOW}Creating bridge .env file...${NC}"
        cp "$BRIDGE_DIR/.env.example" "$BRIDGE_ENV"
        echo -e "${GREEN}✓ .env created from .env.example${NC}"
        echo -e "${YELLOW}Edit $BRIDGE_ENV and configure:${NC}"
        echo "  NEXT_BASE_URL=http://localhost:3000"
        echo "  WHATSAPP_WEB_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3020"
        return 1
    fi
    echo -e "${GREEN}✓ Bridge .env exists${NC}"
    
    # Start bridge
    echo -e "${YELLOW}Starting bridge containers...${NC}"
    cd "$BRIDGE_DIR"
    if docker compose up -d 2>&1 | tee /tmp/docker_output.txt; then
        echo -e "${GREEN}✓ Bridge started${NC}"
        echo -e "${YELLOW}Waiting for bridge to initialize (15s)...${NC}"
        sleep 15
        check_bridge_status
    else
        echo -e "${RED}✗ Failed to start bridge${NC}"
        cat /tmp/docker_output.txt
    fi
    
    echo ""
}

# 3. Configure Environment Variables
configure_env() {
    echo -e "${CYAN}═══ Configure Environment Variables ═══${NC}\n"
    
    echo -e "${YELLOW}Next.js App Environment (.env.local):${NC}"
    
    if [ ! -f "$APP_ENV" ]; then
        echo -e "${RED}✗ .env.local not found${NC}"
        echo -e "${YELLOW}Creating template...${NC}"
        cat > "$APP_ENV" << 'EOF'
# MongoDB
MONGODB_URI_MAIN=mongodb+srv://...
MONGODB_CRM_DB_NAME=swaryoga_admin_crm

# WhatsApp Bridge
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=ws://localhost:3333
NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333
WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024

# JWT
JWT_SECRET=your-secret-key-here
EOF
        echo -e "${GREEN}✓ Template created${NC}"
        echo -e "${YELLOW}Update values in: $APP_ENV${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ .env.local exists${NC}"
    
    # Check required variables
    echo -e "${YELLOW}Checking required variables:${NC}"
    
    local required_vars=(
        "MONGODB_URI_MAIN"
        "NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL"
        "NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" "$APP_ENV"; then
            local value=$(grep "^$var=" "$APP_ENV" | cut -d'=' -f2-)
            if [ -z "$value" ] || [[ "$value" == *"your-"* ]]; then
                echo -e "  ${RED}✗ $var${NC} (needs configuration)"
            else
                echo -e "  ${GREEN}✓ $var${NC}"
            fi
        else
            echo -e "  ${RED}✗ $var${NC} (missing)"
        fi
    done
    
    echo ""
}

# 4. Run Full Diagnostics
run_diagnostics() {
    echo -e "${CYAN}═══ Full Diagnostics ═══${NC}\n"
    
    echo -e "${YELLOW}1. Environment Check${NC}"
    echo -e "  macOS: $(sw_vers -productVersion)"
    echo -e "  Node: $(node --version 2>/dev/null || echo 'Not installed')"
    echo -e "  npm: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo -e "  Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
    echo ""
    
    echo -e "${YELLOW}2. Project Structure${NC}"
    local checks=(
        "$PROJECT_ROOT/app/admin/crm/qr/page.tsx:QR Inbox Page"
        "$PROJECT_ROOT/app/api/admin/crm/whatsapp/qr/send/route.ts:Send API"
        "$PROJECT_ROOT/app/api/admin/crm/whatsapp/qr/chats/route.ts:Chats API"
        "$PROJECT_ROOT/deploy/wa-bridge/docker-compose.yml:Bridge Config"
        "$PROJECT_ROOT/lib/schemas/enterpriseSchemas.ts:Database Schemas"
    )
    
    for check in "${checks[@]}"; do
        local file="${check%%:*}"
        local desc="${check##*:}"
        if [ -f "$file" ]; then
            echo -e "  ${GREEN}✓${NC} $desc"
        else
            echo -e "  ${RED}✗${NC} $desc"
        fi
    done
    echo ""
    
    echo -e "${YELLOW}3. Database Connectivity${NC}"
    if [ -f "$PROJECT_ROOT/lib/db.ts" ]; then
        echo -e "  ${GREEN}✓${NC} Database module exists"
        if grep -q "MONGODB_URI_MAIN" "$APP_ENV" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} MongoDB URI configured"
        else
            echo -e "  ${RED}✗${NC} MongoDB URI not set"
        fi
    fi
    echo ""
    
    echo -e "${YELLOW}4. Bridge Connectivity${NC}"
    check_bridge_status
    
    echo -e "${YELLOW}5. Network Test${NC}"
    echo "  Testing connectivity to bridge..."
    if timeout 5 bash -c "echo >/dev/tcp/localhost/3333" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Local bridge port 3333 accessible"
    else
        echo -e "  ${YELLOW}○${NC} Local bridge not accessible (may be stopped)"
    fi
    
    if timeout 5 curl -s "https://wa-bridge.swaryoga.com/status" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} VPS bridge accessible"
    else
        echo -e "  ${YELLOW}○${NC} VPS bridge not accessible"
    fi
    echo ""
}

# 5. Test Send/Receive Flow
test_flow() {
    echo -e "${CYAN}═══ Test Send/Receive Flow ═══${NC}\n"
    
    echo -e "${YELLOW}Prerequisites:${NC}"
    echo "  • Bridge is running and connected"
    echo "  • Dev server running on :3000 or :3020"
    echo "  • Logged in to CRM"
    echo ""
    
    echo -e "${YELLOW}Steps:${NC}"
    echo "  1. Open: http://localhost:3020/admin/crm/qr"
    echo "  2. You should see a QR code (bridge status = 'qr')"
    echo "  3. Open WhatsApp on phone → Linked Devices → Scan QR"
    echo "  4. Wait for status to show 'connected'"
    echo "  5. Chats will load in the inbox"
    echo ""
    echo -e "${YELLOW}Testing connectivity...${NC}"
    
    # Check if dev server is running
    if timeout 2 bash -c "echo >/dev/tcp/localhost/3020" 2>/dev/null; then
        echo -e "${GREEN}✓ Dev server running on :3020${NC}"
    else
        echo -e "${RED}✗ Dev server not running on :3020${NC}"
        echo -e "${YELLOW}Start with: npm run dev -- --port 3020${NC}"
        return 1
    fi
    
    # Check bridge
    if curl -s "http://localhost:3333/status" > /tmp/bridge_test.json 2>&1; then
        local status=$(jq -r '.status' /tmp/bridge_test.json 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓ Bridge running (status: $status)${NC}"
    else
        echo -e "${RED}✗ Bridge not running${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Open QR page in browser"
    echo "  2. Scan QR with phone"
    echo "  3. Monitor 'Bridge Logs' option from main menu"
    echo ""
}

# 6. View Bridge Logs
view_logs() {
    echo -e "${CYAN}═══ Bridge Logs ═══${NC}\n"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker not installed${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Showing last 50 lines of bridge logs...${NC}"
    echo -e "(Press Ctrl+C to exit)\n"
    
    docker logs wa-bridge -f --tail=50 2>&1 || echo -e "${RED}✗ Bridge container not found${NC}"
}

# 7. Restart Bridge Services
restart_bridge() {
    echo -e "${CYAN}═══ Restart Bridge Services ═══${NC}\n"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker not installed${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Restarting bridge...${NC}"
    
    if docker ps | grep -q wa-bridge; then
        echo -e "${YELLOW}Stopping container...${NC}"
        docker stop wa-bridge || true
        sleep 2
    fi
    
    cd "$BRIDGE_DIR"
    if docker compose up -d 2>&1; then
        echo -e "${GREEN}✓ Bridge restarted${NC}"
        sleep 10
        check_bridge_status
    else
        echo -e "${RED}✗ Failed to restart bridge${NC}"
    fi
}

# 8. Generate QR Code
generate_qr() {
    echo -e "${CYAN}═══ Generate QR Code ═══${NC}\n"
    
    local qr_url="http://localhost:3333/qr"
    
    echo -e "${YELLOW}QR Code URL: $qr_url${NC}"
    echo ""
    
    if curl -s -o /dev/null -w "%{http_code}" "$qr_url" > /tmp/qr_test.txt 2>&1; then
        local status=$(cat /tmp/qr_test.txt)
        if [ "$status" = "200" ]; then
            echo -e "${GREEN}✓ QR endpoint is accessible${NC}"
            echo ""
            echo -e "${YELLOW}To view QR code:${NC}"
            echo "  1. Open: $qr_url"
            echo "  2. Or scan in browser at: http://localhost:3020/admin/crm/qr"
        else
            echo -e "${RED}✗ QR endpoint returned HTTP $status${NC}"
        fi
    else
        echo -e "${RED}✗ QR endpoint unreachable${NC}"
    fi
    echo ""
}

# 9. Create Database Backup
create_backup() {
    echo -e "${CYAN}═══ Create Database Backup ═══${NC}\n"
    
    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/whatsapp_backup_$timestamp.json"
    
    mkdir -p "$backup_dir"
    
    echo -e "${YELLOW}Creating backup...${NC}"
    
    # This would require MongoDB credentials and connection
    # For now, just create a template
    cat > "$backup_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "collections": {
    "leads": "count pending",
    "whatsapp_messages": "count pending",
    "whatsapp_webhook_events": "count pending"
  },
  "note": "To backup MongoDB, use: mongodump --uri=YOUR_MONGODB_URI --out=backup_dir"
}
EOF
    
    echo -e "${GREEN}✓ Backup metadata created: $backup_file${NC}"
    echo ""
    echo -e "${YELLOW}To backup actual data, use:${NC}"
    echo "  mongodump --uri=\$MONGODB_URI_MAIN --out=./backups/mongo_dump"
    echo ""
}

# 10. Test Webhook Events
test_webhook() {
    echo -e "${CYAN}═══ Test Webhook Events ═══${NC}\n"
    
    echo -e "${YELLOW}This tests if the bridge can POST to your API${NC}"
    echo ""
    
    local webhook_url="http://localhost:3020/api/admin/crm/whatsapp/inbound"
    local secret=$(grep "WHATSAPP_WEB_BRIDGE_SECRET" "$APP_ENV" | cut -d'=' -f2-)
    
    if [ -z "$secret" ]; then
        echo -e "${RED}✗ WHATSAPP_WEB_BRIDGE_SECRET not configured${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Sending test webhook...${NC}"
    echo "  URL: $webhook_url"
    echo "  Secret: ${secret:0:10}..."
    echo ""
    
    local test_payload='{
      "event": "message",
      "data": {
        "from": "+919999999999",
        "body": "Test message from webhook diagnostics",
        "timestamp": '$(date +%s)'
      }
    }'
    
    local response=$(curl -s -X POST "$webhook_url" \
      -H "Content-Type: application/json" \
      -H "x-bridge-secret: $secret" \
      -d "$test_payload" \
      -w "\n%{http_code}")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    echo -e "${YELLOW}Response (HTTP $http_code):${NC}"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "$(echo -e ${YELLOW}Enter choice:${NC} )" choice
    echo ""
    
    case $choice in
        1) check_bridge_status ;;
        2) setup_local_bridge ;;
        3) configure_env ;;
        4) run_diagnostics ;;
        5) test_flow ;;
        6) view_logs ;;
        7) restart_bridge ;;
        8) generate_qr ;;
        9) create_backup ;;
        10) test_webhook ;;
        0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
    
    echo ""
    read -p "$(echo -e ${CYAN}Press Enter to continue...${NC})"
    clear
done
