# 🚀 WhatsApp QR Integration - Quick Start (V3 - With VPS)

## 📋 Quick Command Reference

### 🔴 VPS Management (NEW!)
```bash
qa-vps-test              # Test SSH to VPS
qa-vps-menu              # Interactive VPS menu
qa-vps-bridge-status     # Check if bridge running
qa-vps-bridge-start      # Start bridge on VPS
qa-vps-bridge-logs       # Watch bridge logs
```

### 🟢 Local Bridge (Development)
```bash
qa-bridge-start          # Start local bridge on :3333
qa-bridge-status         # Check local bridge
qa-bridge-logs           # View local bridge logs
qa-bridge-stop           # Stop local bridge
```

### 🔵 Dev Server
```bash
qa-dev-start             # Start Next.js dev server :3020
qa-qr-open               # Open QR page in browser
```

### 📊 Database & Diagnostics
```bash
qa-db-check              # Test MongoDB connection
qa-db-messages           # Show recent WhatsApp messages
qa-db-leads              # Show recent leads
qa-diagnose              # Full system check
```

### ⚙️ Configuration
```bash
qa-setup                 # Interactive setup wizard
qa-config-bridge         # Edit bridge .env
qa-config-app            # Edit app .env.local
```

---

## 🎯 First Time Setup

### 1️⃣ Configure EC2 Credentials
```bash
# Read the setup guide
cat EC2_SETUP.md

# Add to ~/.env.local:
# EC2_KEY_PATH=/path/to/key.pem
# VPS_IP=1.2.3.4
# VPS_USER=ec2-user
# etc.
```

### 2️⃣ Test VPS Connection
```bash
source ~/.zshrc
qa-vps-test              # Should show ✅ success
```

### 3️⃣ Check Bridge Status
```bash
qa-vps-bridge-status     # Should show bridge RUNNING
```

### 4️⃣ Start Dev Server
```bash
qa-dev-start             # Starts on localhost:3020
```

### 5️⃣ Open QR Code
```bash
qa-qr-open               # Opens http://localhost:3020/admin/crm/qr
```

### 6️⃣ Scan QR with WhatsApp
1. Open WhatsApp on phone
2. Settings → Linked Devices → Link a Device
3. Point at QR code on screen
4. Confirm linking

### 7️⃣ Start Receiving Messages
- Messages from customers come in real-time
- Your team can respond directly
- Messages attributed to whoever sends them

---

## 🔍 Status Check Commands

### Full Diagnostic
```bash
qa-diagnose
# Shows:
# ✓ .env.local status
# ✓ MongoDB connection
# ✓ Bridge status (local + VPS)
# ✓ Node/Docker versions
# ✓ Dev server status
```

### VPS-Only Check
```bash
qa-vps-info              # Shows VPS IP, SSH connection
qa-vps-status            # Shows uptime, disk, memory, CPU
qa-vps-docker-ps         # Lists all containers
```

### Local Bridge Check
```bash
qa-bridge-status         # Shows if localhost:3333 is up
curl http://localhost:3333/health  # Direct health check
```

---

## 🆘 Troubleshooting

### "VPS not responding"
```bash
qa-vps-test              # Test SSH connection
qa-vps-info              # Show connection info
qa-diagnose              # Full system check
```

### "Bridge not running"
```bash
# On VPS:
qa-vps-bridge-status     # Check status
qa-vps-bridge-restart    # Restart it
qa-vps-bridge-logs       # Watch logs

# Locally:
qa-bridge-status         # Check local bridge
qa-bridge-restart        # Restart local bridge
```

### "Messages not showing up"
```bash
qa-db-messages           # Check database
qa-diagnose              # Full check
qa-test-flow             # Test send/receive
```

### "Can't connect to QR page"
```bash
qa-dev-start             # Ensure server is running
qa-qr-open               # Try opening again
qa-diagnose              # Check configuration
```

---

## 📱 Common Workflows

### View Recent Messages
```bash
qa-db-messages           # Last 10 messages in DB
```

### Check if Bridge is Healthy
```bash
qa-vps-bridge-status     # VPS bridge health
qa-bridge-status         # Local bridge health
```

### Restart Everything (if stuck)
```bash
qa-bridge-restart        # Restart local bridge
qa-vps-bridge-restart    # Restart VPS bridge
qa-dev-start             # Restart dev server
```

### Monitor Bridge Activity
```bash
qa-bridge-logs           # Local bridge
qa-vps-bridge-logs       # VPS bridge
```

---

## 🎓 Learn More

### Detailed Guides
```bash
cat START_HERE.txt                    # Visual overview
cat WHATSAPP_QR_SETUP.md              # Complete setup
cat WHATSAPP_QR_TERMINAL_GUIDE.md     # Full reference
cat EC2_SETUP.md                      # EC2 configuration
```

### View Available Scripts
```bash
ls -la scripts/qa-*.sh                # Show all scripts
```

### Interactive Setup
```bash
qa-setup                              # Menu-based wizard
qa-vps-menu                           # VPS menu
```

---

## ✅ What's Included

| Tool | Purpose |
|------|---------|
| `qa-whatsapp-setup.sh` | Interactive 10-option setup menu |
| `qa-whatsapp-aliases.sh` | 16 shell commands for local bridge |
| `qa-vps-manager.sh` | 17-option VPS management menu |
| `qa-vps-commands.sh` | Quick VPS shell commands |
| All `qa-*` commands | Added to ~/.zshrc automatically |

---

## 🚀 What's Next

Once you have:
1. ✅ EC2 credentials configured
2. ✅ `qa-vps-test` working
3. ✅ Bridge running on VPS
4. ✅ Dev server running

You can:
- Scan QR code with WhatsApp
- Send/receive messages
- View in real-time on QR page
- Track messages in MongoDB
- Manage team response

---

## 💡 Pro Tips

### Auto-start Bridge in Background
```bash
qa-bridge-start          # Runs in background
# Can close terminal and bridge keeps running
```

### Monitor Bridge Without Dev Server
```bash
qa-vps-bridge-logs       # Just watch VPS logs
# Don't need to run dev server to monitor
```

### Check Message in Real-Time
```bash
while true; do qa-db-messages; sleep 5; done
# Updates every 5 seconds
```

### Full System Reset
```bash
qa-bridge-stop
qa-vps-bridge-restart
qa-dev-start
# All systems will be fresh
```

---

**Your terminal is now a complete WhatsApp bridge management center!** 🎉
