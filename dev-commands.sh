#!/bin/bash

# Swar Yoga - Development Commands Cheatsheet
# Save this file and source it in your shell: source dev-commands.sh
# Or just copy-paste the commands you need

echo "🚀 Swar Yoga - Available Commands"
echo "=================================="
echo ""

# ============================================
# START DEVELOPMENT
# ============================================

alias start-dev='
  echo "🟢 Starting development server on port 3001..."
  cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db
  PORT=3001 npm run dev
'

alias start-bridge='
  echo "🟢 Starting WhatsApp bridge on port 3333..."
  cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/deploy/wa-baileys
  node index.js
'

alias start-all='
  echo "🟢 Starting both dev server and bridge..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null
  lsof -ti:3333 | xargs kill -9 2>/dev/null
  sleep 2
  (cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db && PORT=3001 npm run dev &)
  sleep 5
  (cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/deploy/wa-baileys && node index.js &)
  echo "✅ Both servers starting (dev: 3001, bridge: 3333)"
'

# ============================================
# STOP DEVELOPMENT
# ============================================

alias stop-dev='
  echo "🔴 Stopping dev server..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null
  echo "✅ Dev server stopped"
'

alias stop-bridge='
  echo "🔴 Stopping WhatsApp bridge..."
  lsof -ti:3333 | xargs kill -9 2>/dev/null
  echo "✅ Bridge stopped"
'

alias stop-all='
  echo "🔴 Stopping all servers..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null
  lsof -ti:3333 | xargs kill -9 2>/dev/null
  sleep 1
  echo "✅ All servers stopped"
'

# ============================================
# STATUS CHECKS
# ============================================

alias status='
  echo "📊 Server Status:"
  echo ""
  if lsof -ti:3001 > /dev/null 2>&1; then
    echo "✅ Dev Server (3001): UP"
  else
    echo "❌ Dev Server (3001): DOWN"
  fi
  
  if lsof -ti:3333 > /dev/null 2>&1; then
    echo "✅ Bridge Server (3333): UP"
  else
    echo "❌ Bridge Server (3333): DOWN"
  fi
  
  echo ""
  echo "🗄️  Database:"
  if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ MongoDB: Connected"
  else
    echo "❌ MongoDB: Not responding"
  fi
'

# ============================================
# DATABASE OPERATIONS
# ============================================

alias db-clear-auth='
  echo "🗑️  Clearing WhatsApp auth state..."
  node -e "
  const { MongoClient } = require(\"mongodb\");
  (async () => {
    const client = new MongoClient(\"mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/\");
    await client.connect();
    const result = await client.db(\"swaryoga_admin_crm\").collection(\"baileys_auth_state\").deleteMany({});
    console.log(\"✅ Cleared\", result.deletedCount, \"auth records\");
    await client.close();
  })().catch(e => { console.error(e.message); process.exit(1); });
  " 2>/dev/null || echo "Error clearing DB"
'

alias db-check='
  echo "🔍 Checking database..."
  node -e "
  const { MongoClient } = require(\"mongodb\");
  (async () => {
    const client = new MongoClient(\"mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/\");
    await client.connect();
    const db = client.db(\"swaryogadb\");
    const count = await db.collection(\"users\").countDocuments();
    console.log(\"✅ Connected to swaryogadb\");
    console.log(\"📊 Total users:\", count);
    await client.close();
  })().catch(e => { console.error(\"❌\", e.message); process.exit(1); });
  "
'

# ============================================
# PORT CLEANUP
# ============================================

alias ports-clean='
  echo "🧹 Cleaning up ports 3000, 3001, 3333..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  lsof -ti:3333 | xargs kill -9 2>/dev/null || true
  sleep 1
  echo "✅ Ports cleaned"
'

alias port-info='
  echo "📍 Active ports:"
  echo ""
  lsof -i :3000 2>/dev/null || echo "3000: FREE"
  lsof -i :3001 2>/dev/null || echo "3001: FREE"
  lsof -i :3333 2>/dev/null || echo "3333: FREE"
'

# ============================================
# CODE QUALITY & TESTING
# ============================================

alias lint='
  echo "🔍 Checking TypeScript..."
  cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db
  npx tsc --noEmit 2>&1 | head -20
'

alias test-multi-tenant='
  echo "🧪 Testing multi-tenant setup..."
  cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db
  node scripts/test-multi-tenant.js
'

alias check-setup='
  echo "✓ Verifying setup..."
  cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db
  node scripts/check-multi-tenant-setup.js
'

# ============================================
# HELPFUL SHORTCUTS
# ============================================

alias go-main='cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db'
alias go-bridge='cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/deploy/wa-baileys'
alias go-app='cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/app'

alias todo='cat /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/TODO.md'
alias connections-guide='cat /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/CONNECTIONS_MANAGER_GUIDE.md | less'

# ============================================
# CURL HELPERS
# ============================================

alias health='
  echo "🏥 Checking health endpoints..."
  echo ""
  echo "Dev Server:"
  curl -s http://localhost:3001/api/health 2>&1 | head -c 100
  echo ""
  echo ""
  echo "Bridge Server:"
  curl -s http://localhost:3333/health 2>&1 | head -c 100
  echo ""
'

# ============================================
# QUICK START SEQUENCES
# ============================================

echo ""
echo "📌 QUICK COMMANDS:"
echo ""
echo "  Development:"
echo "    start-dev        → Start dev server only"
echo "    start-bridge     → Start WhatsApp bridge only"
echo "    start-all        → Start both servers (recommended)"
echo ""
echo "    stop-dev         → Stop dev server"
echo "    stop-bridge      → Stop WhatsApp bridge"
echo "    stop-all         → Stop all servers"
echo ""
echo "  Monitoring:"
echo "    status           → Show server status"
echo "    health           → Check health endpoints"
echo "    port-info        → Show active ports"
echo ""
echo "  Database:"
echo "    db-clear-auth    → Clear WhatsApp auth"
echo "    db-check         → Verify MongoDB connection"
echo "    ports-clean      → Kill stuck ports"
echo ""
echo "  Testing:"
echo "    lint             → Check TypeScript errors"
echo "    test-multi-tenant → Run multi-tenant tests"
echo "    check-setup      → Verify setup"
echo ""
echo "  Navigation:"
echo "    go-main          → Go to main project"
echo "    go-bridge        → Go to bridge code"
echo "    go-app           → Go to app code"
echo ""
echo "  Documentation:"
echo "    todo             → Show TODO.md"
echo "    connections-guide → Show Connection Manager guide"
echo ""
echo "=================================="
echo ""
