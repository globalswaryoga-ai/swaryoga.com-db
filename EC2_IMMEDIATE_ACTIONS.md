# EC2 Bridge Setup - Immediate Actions

## Current Issues on EC2

### ❌ Problem 1: Disk Space Full
```
npm error nospc ENOSPC: no space left on device
```

**Solution - Run on EC2:**
```bash
# Clean npm cache
npm cache clean --force

# Remove old logs
sudo rm -rf /var/log/*.log /var/log/apt/*.log

# Clean package manager
sudo apt-get clean && sudo apt-get autoclean

# Find and remove large node_modules if they exist
find /home -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Check freed space
df -h
```

---

### ❌ Problem 2: Wrong Directory Path
The error shows you're in `/home/ubuntu/` but we need `/home/ubuntu/wa-bridge/` (or `/home/ec2-user/wa-bridge/`)

**Solution - Run on EC2:**
```bash
# Check which user you are
whoami
# Should print: ubuntu or ec2-user

# Create the bridge directory
mkdir -p /home/ubuntu/wa-bridge
# OR if you're ec2-user:
# mkdir -p /home/ec2-user/wa-bridge

# Verify it exists
ls -la /home/ubuntu/ | grep wa-bridge
```

---

### ❌ Problem 3: Files Not Uploaded Yet
The bridge code (`server.js`, `package.json`, etc.) is not on EC2

**Solution - Run from your Mac:**
```bash
# First, verify the files exist locally
ls -la deploy/wa-bridge/

# Then upload them to EC2
# Replace USERNAME with: ubuntu or ec2-user (whoever you're connected as)
scp -i ~/Downloads/wa-bridge-key-2.pem -r deploy/wa-bridge/* USERNAME@3.80.11.153:/home/USERNAME/wa-bridge/

# Example:
scp -i ~/Downloads/wa-bridge-key-2.pem -r deploy/wa-bridge/* ubuntu@3.80.11.153:/home/ubuntu/wa-bridge/
```

---

## Complete Setup Steps (IN ORDER)

### Step 1: SSH into EC2 (from Mac)
```bash
ssh -i ~/Downloads/wa-bridge-key-2.pem ubuntu@3.80.11.153
# or
ssh -i ~/Downloads/wa-bridge-key-2.pem ec2-user@3.80.11.153
```

### Step 2: Free Up Disk Space (on EC2)
```bash
npm cache clean --force
sudo rm -rf /var/log/*.log /var/log/apt/*.log
sudo apt-get clean && sudo apt-get autoclean
df -h  # Check space freed
```

### Step 3: Create Bridge Directory (on EC2)
```bash
mkdir -p /home/ubuntu/wa-bridge
cd /home/ubuntu/wa-bridge
pwd  # Verify you're in the right place
```

### Step 4: Upload Bridge Files (from Mac - in NEW terminal)
```bash
# Go to your codebase
cd /Users/mohankalburgi/swaryoga.com-db

# Copy all bridge files
scp -i ~/Downloads/wa-bridge-key-2.pem -r deploy/wa-bridge/* ubuntu@3.80.11.153:/home/ubuntu/wa-bridge/

# Verify upload
ssh -i ~/Downloads/wa-bridge-key-2.pem ubuntu@3.80.11.153 "ls -la /home/ubuntu/wa-bridge/"
```

### Step 5: Install Dependencies (on EC2)
```bash
cd /home/ubuntu/wa-bridge
npm install
```

### Step 6: Create .env File (on EC2)
```bash
cat > /home/ubuntu/wa-bridge/.env << 'ENVFILE'
PORT=3333
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_WEB_ALLOWED_ORIGINS=https://crm.swaryoga.com,https://swaryoga.com,https://www.swaryoga.com
NEXT_BASE_URL=https://crm.swaryoga.com
WHATSAPP_CLIENT_ID=crm-whatsapp-session
CHROME_PATH=/usr/bin/google-chrome
ENVFILE
```

### Step 7: Start the Bridge (on EC2)
```bash
cd /home/ubuntu/wa-bridge
node server.js
```

Should see:
```
✓ Using Chrome at: /usr/bin/google-chrome
Bridge server running on port 3333
QR Code ready at http://localhost:3333/qr
```

### Step 8: Run in Background (on EC2 - OPTIONAL)
If you want it to keep running:

**Using npm background:**
```bash
nohup node server.js > bridge.log 2>&1 &
tail -f bridge.log  # Watch logs
```

**Using pm2 (better):**
```bash
npm install -g pm2
pm2 start server.js --name wa-bridge
pm2 startup
pm2 save
pm2 logs wa-bridge
```

---

## Verification Checklist

Once bridge is running, verify from Mac:

```bash
# Check if bridge responds
curl -s https://wa-bridge.swaryoga.com/status | jq .

# Should return QR code data
```

Check from EC2:
```bash
ps aux | grep "node.*server.js"
netstat -tlnp | grep 3333
```

---

## If Something Goes Wrong

### Disk still full?
```bash
# Find large files
du -sh /home/ubuntu/* | sort -rh
du -sh /var/* | sort -rh

# Clean Docker if installed
docker system prune -a
```

### Chrome not found?
```bash
# Install Chrome/Chromium
sudo apt-get update
sudo apt-get install -y chromium-browser

# Or use Google Chrome
sudo apt-get install -y google-chrome-stable
```

### Port 3333 already in use?
```bash
# Find what's using it
lsof -i :3333
sudo kill -9 <PID>
```

### Can't connect to EC2?
```bash
# Check EC2 instance status
# 1. Go to AWS Console
# 2. EC2 Dashboard
# 3. Find instance with IP 3.80.11.153
# 4. Check State (should be "running")
# 5. Check Security Group (should allow inbound on port 22)
```

---

## Your Action Items

1. **SSH into EC2**
2. **Clean disk space**
3. **Create `/home/ubuntu/wa-bridge/` directory**
4. **Upload bridge files from Mac**
5. **Run `npm install`**
6. **Create `.env` file**
7. **Start bridge with `node server.js`**
8. **Verify it's working**

Let me know which step you get stuck on!
