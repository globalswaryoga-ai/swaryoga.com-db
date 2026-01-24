#!/bin/bash

##############################################################################
# EC2 Emergency Cleanup Script
# Aggressively frees disk space on EC2 bridge instance
# 
# Usage: bash scripts/emergency-cleanup.sh
# Or:    npm run bridge:emergency-cleanup
##############################################################################

set -e

# Get SSH key location
SSH_KEY_PATH=$(node scripts/ssh-key-manager.js path 2>/dev/null)

if [ -z "$SSH_KEY_PATH" ] || [ ! -f "$SSH_KEY_PATH" ]; then
  echo "❌ SSH key not found!"
  echo "Please ensure wa-bridge-key.pem exists in:"
  echo "  • ~/.ssh/wa-bridge-key.pem"
  echo "  • ./deploy/wa-bridge/wa-bridge-key.pem"
  exit 1
fi

EC2_IP="52.91.198.23"
EC2_USER="ubuntu"

echo "🔧 EC2 Emergency Cleanup"
echo "════════════════════════════════════════════════════════════════"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔗 Connecting to EC2...${NC}"

# Run cleanup script on EC2
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "${EC2_USER}@${EC2_IP}" bash << 'EOFEC2'

echo -e "\033[0;36m📊 Current Disk Space:\033[0m"
df -h / | tail -1

echo ""
echo -e "\033[1;33m🧹 Cleaning temporary files...\033[0m"

# Clean npm cache
if npm cache clean --force 2>/dev/null; then
  echo -e "\033[0;32m  ✅ NPM cache cleaned\033[0m"
fi

# Clean system logs (keep last week)
if sudo find /var/log -type f -name "*.log" -mtime +7 -delete 2>/dev/null; then
  echo -e "\033[0;32m  ✅ Old logs cleaned\033[0m"
fi

# Truncate large logs
if sudo truncate -s 0 /var/log/kern.log /var/log/auth.log /var/log/syslog 2>/dev/null; then
  echo -e "\033[0;32m  ✅ System logs truncated\033[0m"
fi

# Clean apt cache
if sudo apt-get clean 2>/dev/null; then
  echo -e "\033[0;32m  ✅ APT cache cleaned\033[0m"
fi

# Remove old apt packages
if sudo apt-get autoclean 2>/dev/null; then
  echo -e "\033[0;32m  ✅ Old APT packages removed\033[0m"
fi

# Clean Docker (if installed)
if command -v docker &> /dev/null; then
  echo -e "\033[1;33m🐳 Cleaning Docker...\033[0m"
  if sudo docker system prune -af 2>/dev/null; then
    echo -e "\033[0;32m  ✅ Docker system pruned\033[0m"
  fi
  if sudo docker image prune -af 2>/dev/null; then
    echo -e "\033[0;32m  ✅ Docker images cleaned\033[0m"
  fi
fi

# Clean tmp
if sudo rm -rf /tmp/* 2>/dev/null; then
  echo -e "\033[0;32m  ✅ Temp files cleaned (/tmp)\033[0m"
fi

# Remove core dumps
if sudo find /var/crash -type f -delete 2>/dev/null; then
  echo -e "\033[0;32m  ✅ Core dumps removed\033[0m"
fi

# Clean journal logs (keep 1 week)
if sudo journalctl --vacuum=7d 2>/dev/null; then
  echo -e "\033[0;32m  ✅ Journal logs cleaned\033[0m"
fi

echo ""
echo -e "\033[0;36m📊 Final Disk Space:\033[0m"
df -h / | tail -1

EOFEC2

echo ""
echo -e "${GREEN}✅ Emergency cleanup completed!${NC}"
echo ""
echo -e "${BLUE}💡 If you need to restart the bridge:${NC}"
echo "   npm run bridge:emergency-restart"
