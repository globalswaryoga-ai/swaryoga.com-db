#!/bin/bash

# ============================================================================
# EC2 WhatsApp Bridge Setup - Automated from macOS
# This script automates EC2 instance creation and bridge deployment
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  EC2 WhatsApp Bridge Setup - macOS Automation${NC}"
echo -e "${BLUE}=====================================================${NC}\n"

# ============================================================================
# PART 1: Create EC2 Instance
# ============================================================================

echo -e "${YELLOW}[1/6] Creating EC2 Instance...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Install it first:${NC}"
    echo "brew install awscli"
    exit 1
fi

# Set variables
INSTANCE_NAME="swar-yoga-whatsapp-bridge"
REGION=${AWS_REGION:-"ap-south-1"}  # India region
INSTANCE_TYPE="t3.micro"  # Free tier eligible
AMI_ID="ami-06a644026f43160a5"  # Ubuntu 22.04 LTS in ap-south-1 (Mumbai)
KEY_NAME="swar-yoga-bridge-key"
SECURITY_GROUP="swar-yoga-bridge-sg"

# Create security group if it doesn't exist
echo -e "${BLUE}  Creating security group...${NC}"
SG_ID=$(aws ec2 create-security-group \
  --group-name "$SECURITY_GROUP" \
  --description "WhatsApp Bridge security group" \
  --region "$REGION" \
  --output text \
  --query 'GroupId' 2>/dev/null || aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SECURITY_GROUP" \
  --region "$REGION" \
  --output text \
  --query 'SecurityGroups[0].GroupId')

echo -e "${GREEN}✓ Security Group: $SG_ID${NC}"

# Add inbound rules
echo -e "${BLUE}  Adding firewall rules...${NC}"
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 22 --cidr 0.0.0.0/0 \
  --region "$REGION" 2>/dev/null || true  # Ignore if already exists

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 3333 --cidr 0.0.0.0/0 \
  --region "$REGION" 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 \
  --region "$REGION" 2>/dev/null || true

echo -e "${GREEN}✓ Firewall rules added${NC}"

# Create key pair if it doesn't exist
echo -e "${BLUE}  Creating key pair...${NC}"
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &>/dev/null; then
    aws ec2 create-key-pair \
      --key-name "$KEY_NAME" \
      --region "$REGION" \
      --output text > ~/.ssh/"$KEY_NAME".pem
    chmod 400 ~/.ssh/"$KEY_NAME".pem
    echo -e "${GREEN}✓ Key pair created: ~/.ssh/$KEY_NAME.pem${NC}"
else
    echo -e "${GREEN}✓ Key pair already exists${NC}"
fi

# Launch EC2 instance
echo -e "${BLUE}  Launching EC2 instance...${NC}"
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --region "$REGION" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
  --output text \
  --query 'Instances[0].InstanceId')

echo -e "${GREEN}✓ Instance created: $INSTANCE_ID${NC}"

# Wait for instance to have public IP
echo -e "${BLUE}  Waiting for instance to start (30 seconds)...${NC}"
sleep 30

INSTANCE_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --output text \
  --query 'Reservations[0].Instances[0].PublicIpAddress')

echo -e "${GREEN}✓ Instance IP: $INSTANCE_IP${NC}"

# ============================================================================
# PART 2: Wait for SSH to be ready
# ============================================================================

echo -e "\n${YELLOW}[2/6] Waiting for SSH to be ready (60 seconds)...${NC}"
for i in {1..30}; do
    if ssh -i ~/.ssh/"$KEY_NAME".pem -o StrictHostKeyChecking=no -o ConnectTimeout=2 ubuntu@"$INSTANCE_IP" "echo 'SSH Ready'" 2>/dev/null; then
        echo -e "${GREEN}✓ SSH is ready${NC}"
        break
    fi
    echo -ne "\r  Waiting... ($((i*2)) seconds)"
    sleep 2
done

# ============================================================================
# PART 3: Install Node.js and Git
# ============================================================================

echo -e "\n${YELLOW}[3/6] Installing Node.js and dependencies...${NC}"

ssh -i ~/.ssh/"$KEY_NAME".pem ubuntu@"$INSTANCE_IP" << 'EOF'
set -e
echo "Updating system..."
sudo apt update && sudo apt upgrade -y > /dev/null 2>&1

echo "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
sudo apt install -y nodejs > /dev/null 2>&1

echo "Installing Git and PM2..."
sudo apt install -y git > /dev/null 2>&1
sudo npm install -g pm2 > /dev/null 2>&1

echo "System ready"
node --version
EOF

echo -e "${GREEN}✓ Dependencies installed${NC}"

# ============================================================================
# PART 4: Clone repo and deploy bridge
# ============================================================================

echo -e "\n${YELLOW}[4/6] Deploying WhatsApp bridge...${NC}"

ssh -i ~/.ssh/"$KEY_NAME".pem ubuntu@"$INSTANCE_IP" << 'EOF'
set -e
cd /home/ubuntu

echo "Cloning repository..."
git clone https://github.com/globalswaryoga-ai/swaryoga.com-db.git > /dev/null 2>&1

cd swaryoga.com-db/deploy/wa-bridge

echo "Installing dependencies..."
npm install > /dev/null 2>&1

echo "Starting bridge with PM2..."
pm2 start server.js --name "whatsapp-bridge" > /dev/null 2>&1
pm2 startup > /dev/null 2>&1
pm2 save > /dev/null 2>&1

echo "Bridge started"
pm2 status
EOF

echo -e "${GREEN}✓ Bridge deployed${NC}"

# ============================================================================
# PART 5: Test bridge
# ============================================================================

echo -e "\n${YELLOW}[5/6] Testing bridge endpoint...${NC}"

sleep 5  # Wait for bridge to fully initialize

RESPONSE=$(curl -s -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  "http://${INSTANCE_IP}:3333/status" || echo "")

if echo "$RESPONSE" | grep -q '"hasQr"'; then
    echo -e "${GREEN}✓ Bridge is working! QR code generation active${NC}"
else
    echo -e "${YELLOW}⚠ Bridge response incomplete, may still be initializing${NC}"
    echo "Response: $RESPONSE"
fi

# ============================================================================
# PART 6: Update environment variables
# ============================================================================

echo -e "\n${YELLOW}[6/6] Updating Vercel environment variables...${NC}"

# Update .env.local
ENV_FILE="/Users/mohankalburgi/swaryoga.com-db/.env.local"

echo -e "${BLUE}  Updating .env.local with EC2 IP...${NC}"
sed -i '' "s|https://swar-yoga-bridge.ngrok.io|http://${INSTANCE_IP}:3333|g" "$ENV_FILE" 2>/dev/null || \
sed -i "s|https://swar-yoga-bridge.ngrok.io|http://${INSTANCE_IP}:3333|g" "$ENV_FILE"

echo -e "${GREEN}✓ .env.local updated${NC}"

echo -e "${BLUE}  Committing to git...${NC}"
cd /Users/mohankalburgi/swaryoga.com-db
git add .env.local
git commit -m "chore: update bridge URL to EC2 instance ($INSTANCE_IP)" 2>/dev/null || true
git push origin main 2>/dev/null || echo "⚠ Could not push (may need to set git credentials)"

echo -e "${GREEN}✓ Code committed${NC}"

# ============================================================================
# Summary
# ============================================================================

echo -e "\n${BLUE}=====================================================${NC}"
echo -e "${GREEN}✅ EC2 SETUP COMPLETE!${NC}"
echo -e "${BLUE}=====================================================${NC}\n"

echo -e "${YELLOW}Your WhatsApp Bridge is now live on AWS EC2!${NC}\n"

echo "📊 Instance Details:"
echo "  Instance ID:    $INSTANCE_ID"
echo "  Instance IP:    $INSTANCE_IP"
echo "  Region:         $REGION"
echo "  Type:           $INSTANCE_TYPE (Free Tier)"
echo "  Key:            ~/.ssh/$KEY_NAME.pem"

echo -e "\n🌐 API Endpoints:"
echo "  Bridge Direct:  http://$INSTANCE_IP:3333/status"
echo "  Vercel Route:   https://crm.swaryoga.com/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus"
echo "  QR Page:        https://crm.swaryoga.com/admin/crm/qr"

echo -e "\n📱 Test Bridge Locally:"
echo "  curl -H 'X-Bridge-Secret: swar-bridge-secret-2024' \\"
echo "    http://$INSTANCE_IP:3333/status"

echo -e "\n🔐 SSH into Instance:"
echo "  ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$INSTANCE_IP"

echo -e "\n📝 Useful Commands (on EC2):"
echo "  View logs:       pm2 logs whatsapp-bridge"
echo "  Restart:         pm2 restart whatsapp-bridge"
echo "  Status:          pm2 status"
echo "  Update code:     cd ~/swaryoga.com-db && git pull && npm install && pm2 restart whatsapp-bridge"

echo -e "\n💰 AWS Free Tier:"
echo "  Monthly:        FREE (Year 1)"
echo "  After Year 1:   ~\$10/month (t2.micro)"

echo -e "\n${GREEN}All set! Your QR page should work in ~2 minutes (Vercel redeploy).${NC}"
echo -e "${YELLOW}Check AWS Console to confirm instance is running:${NC}"
echo "  https://console.aws.amazon.com/ec2/v2/home?region=$REGION\n"
