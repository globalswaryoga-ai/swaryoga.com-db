#!/bin/bash

# ============================================================
# IMMEDIATE ACTION: Get SSH Key & Install Permanent Fix
# ============================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║       🔧 PERMANENT FIX: WhatsApp Bridge 24/7 Operation        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📊 CURRENT STATUS:
    ❌ Bridge: DOWN (invalid JSON response)
    ✅ EC2 Instance: RUNNING (52.91.198.23)
    ❌ QR Connection: BLOCKED

🎯 FIX IN 3 STEPS:
════════════════════════════════════════════════════════════════

STEP 1: GET SSH KEY (5 minutes)
────────────────────────────────────────────────────────────────
  1. Open AWS Console: https://console.aws.amazon.com
  2. Go to: EC2 → Key Pairs
  3. Find: wa-bridge-key.pem
  4. Download it
  5. Save to: deploy/wa-bridge/wa-bridge-key.pem
  6. Run: chmod 400 deploy/wa-bridge/wa-bridge-key.pem

  ✅ Key is ready for use

STEP 2: INSTALL PERMANENT SETUP (2 minutes)
────────────────────────────────────────────────────────────────
  Run this command:

    bash deploy/wa-bridge/install-permanent.sh

  This will:
    ✓ Connect to EC2 via SSH
    ✓ Install systemd service
    ✓ Configure health monitoring
    ✓ Start the bridge
    ✓ Verify everything works

STEP 3: VERIFY (1 minute)
────────────────────────────────────────────────────────────────
  Run:
    npm run monitor-bridge

  Should show:
    ✅ Bridge is CONNECTED
       Session: ✓ Ready
       QR Code: ✓ Available

✨ DONE! Bridge now runs permanently!

═══════════════════════════════════════════════════════════════

📚 DOCUMENTATION:
   Read: BRIDGE_PERMANENT_FIX.md
   Full guide with all details

🔧 COMMANDS:
   ssh -i deploy/wa-bridge/wa-bridge-key.pem ubuntu@52.91.198.23
   npm run monitor-bridge
   npm run ec2:status

🚀 WHAT HAPPENS AFTER SETUP:
   ✓ Bridge auto-starts on EC2 boot
   ✓ Bridge auto-restarts if it crashes
   ✓ Health checks every 5 minutes
   ✓ EC2 auto-recovers if instance stops
   ✓ Users can scan QR anytime

═══════════════════════════════════════════════════════════════

⏰ TIME ESTIMATE: 8 minutes total
💾 DATA NEEDED: SSH key only
🔒 SECURITY: All traffic encrypted, credentials secure

Let's fix this! 🚀

EOF
