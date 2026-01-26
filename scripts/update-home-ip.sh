#!/bin/bash

###############################################
# Update Home IP for EC2 Access
# Updates UFW firewall to allow new home IP
# 
# Usage: 
#   ./scripts/update-home-ip.sh YOUR_NEW_IP
#
# Example:
#   ./scripts/update-home-ip.sh 103.45.67.89
###############################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# EC2 Configuration
EC2_IP="52.91.198.23"
SSH_KEY="deploy/wa-bridge/wa-bridge-key.pem"

echo ""
echo -e "${BLUE}🏠 Update Home IP for EC2 Access${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if IP provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}No IP provided. Getting your current public IP...${NC}"
  NEW_IP=$(curl -s ifconfig.me)
  echo -e "Your current IP: ${GREEN}$NEW_IP${NC}"
  read -p "Use this IP? (y/n): " confirm
  if [ "$confirm" != "y" ]; then
    echo -e "${RED}Usage: $0 YOUR_NEW_IP${NC}"
    echo "Example: $0 103.45.67.89"
    exit 1
  fi
else
  NEW_IP="$1"
fi

# Validate IP format (basic check)
if ! [[ $NEW_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}❌ Invalid IP format: $NEW_IP${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}📡 Connecting to EC2 ($EC2_IP)...${NC}"
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
  echo "Make sure you're running from project root"
  exit 1
fi

# Create the remote commands
REMOTE_COMMANDS=$(cat <<EOF
echo "🔐 Updating UFW firewall rules..."

# Remove old home IP rules (if any exist)
sudo ufw status numbered | grep -E "22/tcp|3333/tcp" | grep -v "Anywhere" | awk '{print \$1}' | tr -d '[]' | sort -rn | while read num; do
  sudo ufw --force delete \$num 2>/dev/null || true
done

# Add new IP for SSH
sudo ufw allow from $NEW_IP to any port 22 proto tcp comment "Home IP SSH"
echo "✓ SSH (22) allowed from $NEW_IP"

# Add new IP for Bridge
sudo ufw allow from $NEW_IP to any port 3333 proto tcp comment "Home IP Bridge"
echo "✓ Bridge (3333) allowed from $NEW_IP"

# Show current status
echo ""
echo "📋 Current UFW Rules:"
sudo ufw status | head -20

echo ""
echo "✅ Firewall updated successfully!"
EOF
)

# Execute on EC2
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$EC2_IP "$REMOTE_COMMANDS"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Done! Your home IP ($NEW_IP) is now whitelisted${NC}"
echo ""
echo -e "You can now:"
echo -e "  • SSH: ssh -i $SSH_KEY ubuntu@$EC2_IP"
echo -e "  • Access Bridge: http://$EC2_IP:3333/health"
echo ""
