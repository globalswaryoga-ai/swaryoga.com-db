#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════
#  🚨 UNSAFE ENVIRONMENTS - QUICK FIX SCRIPT
# ════════════════════════════════════════════════════════════════════════════
#
# This script highlights which files have unsafe hardcoded secrets
# and provides quick commands to find and replace them.
#
# Usage: bash unsafe-environments-quick-fix.sh [option]
#   - check    : Find all unsafe hardcoded secrets
#   - list     : Show files with secrets
#   - help     : Show this help
#
# ════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🚨 UNSAFE ENVIRONMENTS - QUICK REFERENCE             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Function to check for secrets
check_secrets() {
    echo "🔍 Scanning for hardcoded secrets in repository..."
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔴 CRITICAL: MongoDB Credentials"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Files with MongoDB URI + password:"
    grep -r "mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje" . \
        --include="*.js" --include="*.sh" --include="*.ts" --include="*.tsx" \
        --include="*.dotenv" 2>/dev/null || echo "   ✓ No matches found"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔴 CRITICAL: Meta Access Token"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Files with WhatsApp Meta Access Token:"
    grep -r "EAAZA17SDRZATgBQU6L6BlN4nqTAWP2m1Iyf" . \
        --include="*.js" --include="*.sh" --include="*.ts" --include="*.tsx" \
        --include="*.dotenv" 2>/dev/null || echo "   ✓ No matches found"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔴 CRITICAL: Meta App Secret"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Files with Meta App Secret (ce4bf92f6be0c7bace755a216cbf1ef2):"
    grep -r "ce4bf92f6be0c7bace755a216cbf1ef2" . \
        --include="*.js" --include="*.sh" --include="*.ts" --include="*.tsx" \
        --include="*.dotenv" 2>/dev/null || echo "   ✓ No matches found"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🟠 HIGH: Webhook Verify Tokens"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Files with hardcoded verify tokens:"
    grep -r "ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d" . \
        --include="*.js" --include="*.sh" --include="*.ts" --include="*.tsx" \
        --include="*.dotenv" 2>/dev/null || echo "   ✓ No matches found"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🟡 MEDIUM: Bridge Secrets (Hardcoded Defaults)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Files with 'swar-bridge-secret-2024' hardcoded:"
    COUNT=$(grep -r "swar-bridge-secret-2024" . \
        --include="*.js" --include="*.sh" --include="*.ts" --include="*.tsx" \
        --include="*.tsx" --include="*.md" --include="*.cjs" 2>/dev/null | wc -l)
    echo "   Found in $COUNT locations (should use process.env instead)"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "For complete details, see: UNSAFE_ENVIRONMENTS_REPORT.md"
    echo "For remediation steps, see: REMEDIATION_ACTION_PLAN.md"
    echo ""
}

# Function to list unsafe files
list_files() {
    echo "📄 CRITICAL FILES WITH HARDCODED SECRETS:"
    echo ""
    echo "🔴 Must Remove from Git History:"
    echo "   ├─ .env.production (MongoDB URI, Meta tokens)"
    echo "   ├─ deep-repair.js (Line 4: MongoDB URI)"
    echo "   ├─ diagnose-webhook-issue.sh (Line 67: MongoDB URI)"
    echo "   └─ test-webhook-flow.sh (Line 36: MongoDB URI + Access Token)"
    echo ""
    
    echo "🟡 Must Update to Use process.env:"
    echo "   ├─ services/whatsapp-web/index.js"
    echo "   ├─ services/whatsapp-web/ecosystem.config.cjs"
    echo "   ├─ app/api/admin/crm/whatsapp/qr/send/route.ts"
    echo "   ├─ app/api/admin/crm/whatsapp/qr/chats/route.ts"
    echo "   ├─ app/api/admin/crm/whatsapp/qr-bridge/route.ts"
    echo "   ├─ app/api/admin/crm/whatsapp/media-upload/route.ts"
    echo "   ├─ app/admin/crm/qr/page.tsx"
    echo "   ├─ setup-wa-bridge-macos.sh"
    echo "   └─ ... + 32 more files"
    echo ""
    
    echo "ℹ️  Use grep to find all:"
    echo "   grep -r 'swar-bridge-secret-2024' . --include='*.js' --include='*.ts'"
    echo ""
}

# Function to show help
show_help() {
    cat << 'EOF'
╔════════════════════════════════════════════════════════════════════════════╗
║                  🚨 UNSAFE ENVIRONMENTS - EMERGENCY GUIDE                  ║
╚════════════════════════════════════════════════════════════════════════════╝

SEVERITY LEVELS:
  🔴 CRITICAL (0-1 hour): 
     - MongoDB credentials (swarsakshi9_db_user + password)
     - Meta Access Token (EAAZA17SDRZATgBQU6L6BlN4...)
     - Meta App Secret (ce4bf92f6be0c7bace755a216cbf1ef2)
  
  🟠 HIGH (1-3 hours):
     - Webhook Verify Tokens (ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d)
  
  🟡 MEDIUM (3-6 hours):
     - Hardcoded bridge secret defaults (swar-bridge-secret-2024)

IMMEDIATE ACTIONS:
  1. Revoke MongoDB password: https://cloud.mongodb.com → Database Users
  2. Regenerate Meta tokens: https://developers.facebook.com/apps
  3. Generate new verify token: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  4. Remove .env.production from git history (see REMEDIATION_ACTION_PLAN.md)
  5. Create .env.local with new credentials

DOCUMENTATION:
  📄 UNSAFE_ENVIRONMENTS_REPORT.md   ← Full security audit
  📄 REMEDIATION_ACTION_PLAN.md      ← Step-by-step fix guide

QUICK COMMANDS:
  # Check for secrets
  bash unsafe-environments-quick-fix.sh check

  # List affected files
  bash unsafe-environments-quick-fix.sh list

  # Find MongoDB URI in git history
  git log -p | grep "mongodb+srv://swarsakshi9_db_user"

  # Generate new webhook token
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

  # Remove .env.production from git
  git filter-branch --tree-filter 'rm -f .env.production' -- --all
  git push --force-with-lease origin main

TIMELINE:
  ⏱️  Phase 1 (Damage Control): 30 min
  ⏱️  Phase 2 (Remove from Git): 1.5 hrs
  ⏱️  Phase 3 (Code Changes): 2-3 hrs
  ⏱️  Phase 4 (Verify): 30 min
  ⏱️  Total: 4-5 hours

DONT'S:
  ❌ Don't commit any .env.* files
  ❌ Don't use hardcoded defaults in code
  ❌ Don't share credentials in Slack/Email
  ❌ Don't skip revocation of exposed credentials

DO'S:
  ✅ Use process.env for all secrets
  ✅ Check .gitignore before committing
  ✅ Use .env.example as template
  ✅ Rotate secrets quarterly

SUPPORT:
  If you get stuck, run: bash unsafe-environments-quick-fix.sh check
  Then review: REMEDIATION_ACTION_PLAN.md Phase 2

═══════════════════════════════════════════════════════════════════════════════
Last Updated: January 15, 2026
Status: 🚨 URGENT - ACTION REQUIRED
═══════════════════════════════════════════════════════════════════════════════
EOF
}

# Main script logic
case "${1:-help}" in
    check)
        check_secrets
        ;;
    list)
        list_files
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        ;;
esac

echo ""
echo "Need more details? Read REMEDIATION_ACTION_PLAN.md"
echo ""
