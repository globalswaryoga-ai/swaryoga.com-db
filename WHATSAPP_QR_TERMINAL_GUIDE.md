# WhatsApp QR Integration - macOS Terminal Guide

## 🚀 Quick Start

### 1. **Setup Terminal Aliases (One-time)**

Add these aliases to your shell configuration file:

```bash
# Add to ~/.zshrc (for zsh, macOS default) or ~/.bash_profile
source /Users/mohankalburgi/swaryoga.com-db/scripts/qa-whatsapp-aliases.sh
```

Then reload your shell:
```bash
source ~/.zshrc  # or ~/.bash_profile
```

### 2. **Show Available Commands**

```bash
qa-help
```

You should see all available commands organized by category.

---

## 📋 Common Workflows

### Workflow 1: Setup Local Development (First Time)

```bash
# 1. Run interactive setup wizard
qa-setup

# 2. Configure environment
#    Follow prompts to set MongoDB URI, bridge settings, etc.

# 3. Start bridge
qa-bridge-start

# 4. Start dev server
qa-dev-start

# 5. Open QR page in browser
qa-qr-open
```

### Workflow 2: Daily Development

```bash
# Terminal 1: Start bridge
qa-bridge-start
qa-bridge-logs          # Monitor logs

# Terminal 2: Start dev server
qa-dev-start            # Runs on :3020

# Terminal 3: Check status
qa-diagnose             # Full system status
qa-test-flow            # Test everything works
```

### Workflow 3: Debug Connection Issues

```bash
# Check what's running
qa-diagnose

# Check bridge specifically
qa-bridge-status
qa-bridge-logs

# Restart everything
qa-bridge-restart
sleep 5
qa-test-flow
```

### Workflow 4: Work with Messages

```bash
# View recent WhatsApp messages from database
qa-db-messages

# View recent leads
qa-db-leads

# Check database is accessible
qa-db-check
```

---

## 🛠️ All Available Commands

### **Bridge Commands**

| Command | What it does |
|---------|-------------|
| `qa-bridge-status` | Show current bridge status (running/disconnected) |
| `qa-bridge-start` | Start Docker container for WhatsApp bridge |
| `qa-bridge-stop` | Stop bridge container |
| `qa-bridge-restart` | Restart bridge (useful when stuck) |
| `qa-bridge-logs` | Show live bridge logs (Ctrl+C to exit) |

**Example:**
```bash
$ qa-bridge-status
{
  "status": "qr",
  "connected": false,
  "reason": "Awaiting QR scan"
}
```

### **Development Server Commands**

| Command | What it does |
|---------|------------|
| `qa-dev-start` | Start Next.js dev server on port 3020 |
| `qa-qr-open` | Open the QR page in your default browser |

**Example:**
```bash
# Terminal 1
$ qa-dev-start
ready - started server on 0.0.0.0:3020

# Terminal 2 (in another terminal)
$ qa-qr-open
# Browser opens to http://localhost:3020/admin/crm/qr
```

### **Database Commands**

| Command | What it does |
|---------|------------|
| `qa-db-check` | Test MongoDB connection |
| `qa-db-messages` | List last 10 WhatsApp messages |
| `qa-db-leads` | List last 10 leads with assignments |

**Example:**
```bash
$ qa-db-messages
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "phoneNumber": "+919123456789",
    "messageContent": "Hello from bridge",
    "direction": "inbound",
    "createdAt": "2026-01-12T10:30:00Z"
  },
  ...
]
```

### **Diagnostics Commands**

| Command | What it does |
|---------|------------|
| `qa-diagnose` | Full system health check (OS, Docker, Services, Files) |
| `qa-test-flow` | Test complete send/receive pipeline |

**Example:**
```bash
$ qa-diagnose
╔════════════════════════════════════════╗
║  WhatsApp QR - Full Diagnostics        ║
╚════════════════════════════════════════╝

1. System Info
   macOS: 14.2.1
   Node: v18.17.0
   npm: 9.8.1
   Docker: Docker version 24.0.6

2. Project Files
   ✓ QR Page
   ✓ Bridge Config
   ✓ .env.local

3. Services
   ✓ Local Bridge (127.0.0.1:3333)
   ✗ Dev Server (localhost:3020)
   ✓ VPS Bridge (wa-bridge.swaryoga.com)
```

### **Configuration Commands**

| Command | What it does |
|---------|------------|
| `qa-setup` | Interactive setup wizard (full menu) |
| `qa-config-bridge` | Edit bridge `.env` file |
| `qa-config-app` | Edit app `.env.local` file |

**Example:**
```bash
$ qa-config-bridge
# Opens .env in your $EDITOR
# Edit NEXT_BASE_URL, WHATSAPP_WEB_BRIDGE_SECRET, etc.
```

### **Utility Commands**

| Command | What it does |
|---------|------------|
| `qa-help` | Show all available commands |

---

## 📊 Complete Setup Wizard

Run the interactive menu for detailed configuration:

```bash
qa-setup
```

This opens a menu with these options:

```
1. Check Bridge Status (VPS)
   └─ Connects to https://wa-bridge.swaryoga.com
   └─ Also checks localhost:3333 for dev setup

2. Setup Local Development Bridge
   └─ Creates .env from .env.example
   └─ Starts Docker container
   └─ Waits 15s for initialization

3. Configure Environment Variables
   └─ Checks .env.local exists
   └─ Validates required variables
   └─ Shows what needs updating

4. Run Full Diagnostics
   └─ System info (macOS version, Node, Docker)
   └─ Project structure verification
   └─ Database connectivity test
   └─ Network connectivity test

5. Test Send/Receive Flow
   └─ Verifies dev server running
   └─ Verifies bridge running
   └─ Shows next steps for testing

6. View Bridge Logs
   └─ Streams real-time Docker logs
   └─ Useful for debugging issues

7. Restart Bridge Services
   └─ Stops and restarts Docker container
   └─ Waits for initialization

8. Generate QR Code
   └─ Checks if QR endpoint is accessible
   └─ Shows URL to view

9. Create Database Backup
   └─ Saves metadata about current data
   └─ Shows MongoDB dump command

10. Test Webhook Events
    └─ Sends test message to /api/admin/crm/whatsapp/inbound
    └─ Verifies bridge can POST to your app
```

---

## 🔧 Troubleshooting

### "Bridge not running"

```bash
# Check if Docker is running
qa-bridge-status

# If not, start it
qa-bridge-start

# Watch logs for errors
qa-bridge-logs
```

### "Dev server not responding"

```bash
# Check if it's running
qa-diagnose

# Start it in a separate terminal
qa-dev-start
```

### "QR page shows 'Bridge Unreachable'"

```bash
# 1. Check bridge status
qa-bridge-status

# 2. View logs to see errors
qa-bridge-logs

# 3. Try restarting
qa-bridge-restart

# 4. Run full diagnostics
qa-diagnose
```

### "Can't send/receive messages"

```bash
# 1. Test the full flow
qa-test-flow

# 2. Check database
qa-db-check
qa-db-messages

# 3. Check bridge status
qa-bridge-logs | grep -i "error\|fail\|warn"

# 4. Restart everything
qa-bridge-restart
sleep 10
qa-test-flow
```

### "Database connection error"

```bash
# Check .env.local has MongoDB URI
grep MONGODB_URI_MAIN /Users/mohankalburgi/swaryoga.com-db/.env.local

# Check connectivity
qa-db-check

# Edit config if needed
qa-config-app
```

---

## 🔌 Environment Variables Explained

### Bridge Configuration (`.env` in `deploy/wa-bridge/`)

```bash
# Where to POST incoming messages
NEXT_BASE_URL=http://localhost:3000
# or
NEXT_BASE_URL=https://crm.swaryoga.com

# Allowed origins for browser requests
WHATSAPP_WEB_ALLOWED_ORIGINS=http://localhost:3000,https://crm.swaryoga.com

# Shared secret for authentication
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024

# Session identifier (for multiple accounts)
WHATSAPP_CLIENT_ID=crm-whatsapp-session
```

### App Configuration (`.env.local` in project root)

```bash
# MongoDB connection
MONGODB_URI_MAIN=mongodb+srv://user:pass@cluster.mongodb.net/db

# Bridge URLs (change if using different bridge)
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333
# or
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com

# Shared secret (must match bridge secret)
NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
```

---

## 📝 Example Session

Here's what a typical development session looks like:

```bash
# Terminal 1: Setup and start bridge
$ qa-bridge-status
Bridge not responding

$ qa-bridge-start
Starting WhatsApp bridge...
Creating network "wa-bridge_default" with the default driver
Creating wa-bridge ... done
Waiting for bridge to initialize (15s)...
✓ VPS Bridge is online (bridge status not checked)
✓ Local Bridge is online
{ "status": "disconnected" }

# Terminal 2: Start dev server
$ qa-dev-start
> next dev -- --port 3020

  ▲ Next.js 14.0.3
  - ready started server on 0.0.0.0:3020, url: http://localhost:3020

# Terminal 3: Open QR page
$ qa-qr-open
# Browser opens to http://localhost:3020/admin/crm/qr
# You see QR code waiting for scan

# Now scan with WhatsApp phone:
# WhatsApp → Linked Devices → Link a device → Scan QR

# Check bridge status updates
$ qa-bridge-status
{ "status": "connected" }

# View messages (after some activity)
$ qa-db-messages
[
  { "phoneNumber": "+919123456789", "messageContent": "Hello", ... },
  ...
]

# Full health check
$ qa-diagnose
✓ Local Bridge (127.0.0.1:3333)
✓ Dev Server (localhost:3020)
✓ VPS Bridge (wa-bridge.swaryoga.com)
```

---

## 🎯 Quick Reference Cheat Sheet

```bash
# === BRIDGE ===
qa-bridge-start              # Start it
qa-bridge-stop               # Stop it
qa-bridge-restart            # Restart it
qa-bridge-status             # Check status
qa-bridge-logs               # Watch logs

# === DEV ===
qa-dev-start                 # Start on :3020
qa-qr-open                   # Open browser

# === DATA ===
qa-db-check                  # Test connection
qa-db-messages               # Show last 10 messages
qa-db-leads                  # Show last 10 leads

# === DIAGNOSE ===
qa-diagnose                  # Full health check
qa-test-flow                 # Test everything

# === CONFIG ===
qa-setup                     # Interactive wizard
qa-config-bridge             # Edit bridge .env
qa-config-app                # Edit app .env

# === HELP ===
qa-help                      # All commands
```

---

## 📞 Still Need Help?

1. **Check logs**: `qa-bridge-logs`
2. **Run diagnostics**: `qa-diagnose`
3. **Review setup**: `qa-setup` → option 4 (Full Diagnostics)
4. **Check documentation**: Read copilot-instructions.md in `.github/`

---

## ✅ Success Indicators

You'll know everything is working when:

- ✅ `qa-diagnose` shows all services with ✓
- ✅ `qa-bridge-status` returns `"status": "connected"`
- ✅ QR page at http://localhost:3020/admin/crm/qr loads
- ✅ `qa-db-messages` shows recent messages
- ✅ Scanning QR with WhatsApp populates chats
- ✅ Messages sent from inbox appear in WhatsApp
- ✅ Messages from WhatsApp appear in inbox

---

Created: January 2026  
Updated for macOS terminal workflows
