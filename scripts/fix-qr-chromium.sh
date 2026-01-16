#!/bin/bash

# Comprehensive QR Code Installation & Verification Script
# This script installs Chromium on EC2 and restarts the bridge service

set -e  # Exit on error

echo "🔧 QR Code Auto-Fix Script"
echo "=================================="
echo ""

# Configuration
EC2_HOST="3.109.154.61"
EC2_USER="ubuntu"
BRIDGE_PORT="3333"
BRIDGE_SECRET="swar-bridge-secret-2024"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Check EC2 Connectivity${NC}"
if ping -c 1 -W 2 $EC2_HOST > /dev/null 2>&1; then
    echo -e "${GREEN}✅ EC2 host is reachable${NC}"
else
    echo -e "${RED}❌ Cannot reach EC2 host ($EC2_HOST)${NC}"
    echo "Please check:"
    echo "  1. Security group allows ICMP"
    echo "  2. EC2 instance is running"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Generate Installation Commands${NC}"

# Create the installation script
cat > /tmp/install-chromium-ec2.sh << 'INSTALL_SCRIPT'
#!/bin/bash
set -e

echo "Installing Chromium and dependencies..."

# Update package lists
sudo apt-get update -qq || true

# Install Chromium
echo "Installing chromium-browser..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium-browser 2>&1 | tail -10

# Install additional dependencies for Puppeteer
echo "Installing dependencies..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  libxss1 \
  libappindicator1 \
  libindicator7 \
  libnss3 \
  libgconf-2-4 \
  libxss1 \
  libappindicator1 \
  libappindicator3-1 \
  libindicator7 \
  libudev0 \
  libgconf-2-4 \
  libxtst6 \
  libxss1 \
  libappindicator1 \
  libappindicator3-1 \
  libindicator7 2>&1 | tail -10 || true

# Verify Chromium installation
if command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium installed successfully"
    chromium-browser --version
else
    echo "❌ Chromium installation failed"
    exit 1
fi

# Clean Puppeteer cache
echo "Cleaning Puppeteer cache..."
rm -rf ~/.cache/puppeteer ~/.cache/google-chrome 2>/dev/null || true

# Navigate to bridge directory and reinstall dependencies
echo "Reinstalling Node dependencies..."
cd /home/ubuntu/swaryoga-bridge || cd /opt/swaryoga-bridge || cd ~/swaryoga-bridge || {
    echo "Could not find bridge directory"
    exit 1
}

# Install with Puppeteer using system Chromium
PUPPETEER_SKIP_DOWNLOAD=true npm ci 2>&1 | tail -10

# Restart the bridge service
echo "Restarting bridge service..."
pm2 restart wa-bridge || {
    # If pm2 not found, try to start manually
    npm start 2>&1 &
    sleep 5
}

echo "Waiting for bridge to initialize..."
sleep 15

# Verify bridge is responding
echo "Verifying bridge status..."
if curl -s -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/health | grep -q '"ok"'; then
    echo "✅ Bridge is responding"
else
    echo "⚠️  Bridge may still be initializing"
fi

echo ""
echo "🎉 Installation complete!"
echo "Check QR status: curl -H 'X-Bridge-Secret: swar-bridge-secret-2024' http://localhost:3333/status | jq '.hasQr'"
INSTALL_SCRIPT

chmod +x /tmp/install-chromium-ec2.sh

echo -e "${GREEN}✅ Installation script created${NC}"
echo ""

echo -e "${BLUE}Step 3: Installation Methods${NC}"
echo ""
echo "Choose one of the following methods:"
echo ""
echo -e "${YELLOW}Method 1: Manual SSH (Recommended if you have SSH access)${NC}"
echo "========================================================"
echo "ssh -i your-key.pem ubuntu@$EC2_HOST 'bash -s' < /tmp/install-chromium-ec2.sh"
echo ""

echo -e "${YELLOW}Method 2: Using AWS Systems Manager (if instance has SSM role)${NC}"
echo "========================================================="
echo "aws ssm send-command \\"
echo "  --instance-ids i-0d2fb8b38cb190ffe \\"
echo "  --region ap-south-1 \\"
echo "  --document-name AWS-RunShellScript \\"
echo "  --parameters 'commands=[\"sudo apt-get update -qq\",\"sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium-browser\",\"cd /home/ubuntu/swaryoga-bridge && PUPPETEER_SKIP_DOWNLOAD=true npm ci\",\"pm2 restart wa-bridge\"]'"
echo ""

echo -e "${YELLOW}Method 3: Docker Deployment (Recommended for long-term)${NC}"
echo "=========================================================="
echo "cd /path/to/repo"
echo "docker build -f services/whatsapp-web/Dockerfile.production -t swaryoga-bridge:latest ."
echo "docker run -d --name swaryoga-bridge -p 3333:3333 -e BRIDGE_SECRET=swar-bridge-secret-2024 swaryoga-bridge:latest"
echo ""

echo -e "${BLUE}Step 4: What to do next${NC}"
echo "=========================================================="
echo ""
echo "1️⃣  Choose a method above and execute it on your EC2 instance"
echo ""
echo "2️⃣  Verify installation:"
echo "    ssh ubuntu@$EC2_HOST 'chromium-browser --version'"
echo ""
echo "3️⃣  After installation, test QR:"
echo "    node scripts/verify-qr-status.js"
echo ""
echo "4️⃣  If QR works, access it at:"
echo "    https://crm.swaryoga.com/admin/crm/qr"
echo ""

echo -e "${BLUE}Step 5: Automated Installation (Experimental)${NC}"
echo "=========================================================="
echo ""
echo "If the above methods don't work, we can try:"
echo ""

# Check if we can execute remotely
if command -v aws &> /dev/null; then
    echo "AWS CLI detected. Attempting remote execution..."
    
    INSTANCE_ID="i-0d2fb8b38cb190ffe"
    REGION="ap-south-1"
    
    # Check if instance has SSM agent
    INSTANCE_INFO=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION 2>/dev/null || echo "")
    
    if [ -n "$INSTANCE_INFO" ]; then
        echo -e "${GREEN}✅ AWS credentials available${NC}"
        echo ""
        echo "Instance found. You can use AWS Systems Manager to install Chromium:"
        echo ""
        echo "aws ssm send-command \\"
        echo "  --instance-ids $INSTANCE_ID \\"
        echo "  --region $REGION \\"
        echo "  --document-name AWS-RunShellScript \\"
        echo "  --parameters 'commands=[\"set -e\",\"sudo apt-get update -qq\",\"sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium-browser\",\"echo Chromium installed\"]'"
        echo ""
    else
        echo -e "${YELLOW}⚠️  Could not verify instance via AWS${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  AWS CLI not installed${NC}"
    echo "    Install it with: brew install awscli"
fi

echo ""
echo -e "${BLUE}📊 Current Bridge Status${NC}"
echo "=========================================================="
echo ""

# Get current QR status
STATUS=$(curl -s -H "X-Bridge-Secret: $BRIDGE_SECRET" http://$EC2_HOST:$BRIDGE_PORT/status 2>/dev/null || echo '{"hasQr":false}')
HAS_QR=$(echo $STATUS | grep -o '"hasQr":[^,}]*' | cut -d: -f2)

if [ "$HAS_QR" = "true" ]; then
    echo -e "${GREEN}✅ QR code is AVAILABLE${NC}"
    echo "   You can now access: https://crm.swaryoga.com/admin/crm/qr"
else
    echo -e "${RED}❌ QR code is NOT available${NC}"
    echo "   Chromium needs to be installed on EC2"
fi

echo ""
echo -e "${BLUE}Need Help?${NC}"
echo "=========================================================="
echo "Run this for more detailed diagnostics:"
echo "  node scripts/verify-qr-status.js"
echo ""
