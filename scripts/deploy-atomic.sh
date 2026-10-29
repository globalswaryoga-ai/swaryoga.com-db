#!/bin/bash
set -e

# ==============================================================================
# SwarYoga Atomic Zero-Downtime Deployment (Vercel-like Blue/Green on Contabo VPS)
# ==============================================================================

PROJECT_DIR="/var/www/swaryoga"
cd "$PROJECT_DIR"

echo "🚀 [Deploy] Starting Atomic Zero-Downtime Deployment..."
echo "🕒 Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

# 1. Clean previous staging directory if exists
rm -rf .next_staging
mkdir -p .next_snapshots

# 2. Build into isolated staging directory (.next_staging)
#    Live site keeps running on current .next with ZERO downtime!
echo "📦 [Build] Compiling new build into isolated staging (.next_staging)..."
export NEXT_DIST_DIR=".next_staging"
export NODE_OPTIONS="--max-old-space-size=6144"

if ! npx next build; then
  echo "❌ [Build Error] New build failed compilation!"
  echo "🛡️ [Safety] Live site was NOT touched and remains 100% operational."
  rm -rf .next_staging
  exit 1
fi

# 3. Automated Health Verification ("well check as- built well or not")
echo "🔍 [Verify] Validating build artifacts..."
if [ ! -f ".next_staging/BUILD_ID" ]; then
  echo "❌ [Verify Error] BUILD_ID missing from .next_staging! Aborting switch."
  rm -rf .next_staging
  exit 1
fi

if [ ! -f ".next_staging/server/pages-manifest.json" ]; then
  echo "❌ [Verify Error] pages-manifest.json missing! Aborting switch."
  rm -rf .next_staging
  exit 1
fi

BUILD_ID=$(cat .next_staging/BUILD_ID)
echo "✅ [Verify OK] Build verified successfully! (Build ID: $BUILD_ID)"

# 4. Snapshot current live build before switching (keep last 5 for instant rollback)
if [ -d ".next" ]; then
  SNAPSHOT_DIR=".next_snapshots/snapshot_$(date +%Y%m%d_%H%M%S)"
  echo "📸 [Snapshot] Archiving current live build to $SNAPSHOT_DIR..."
  cp -r .next "$SNAPSHOT_DIR"
  # Keep only the 5 most recent snapshots to save disk space
  ls -dt .next_snapshots/snapshot_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
fi

# 5. Instant Atomic Switch (< 1ms inode move)
echo "⚡ [Atomic Swap] Swapping .next_staging to live .next..."
if [ -d ".next" ]; then
  mv .next .next_old
  mv .next_staging .next
  rm -rf .next_old
else
  mv .next_staging .next
fi

# 6. Graceful PM2 reload (clear NEXT_DIST_DIR so PM2 serves from .next)
echo "🔄 [PM2] Gracefully reloading swaryoga..."
unset NEXT_DIST_DIR
pm2 reload swaryoga

# 7. Post-deployment live health check
echo "🩺 [Health Check] Testing live HTTP status..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
  echo "🎉 [Success] Atomic deployment complete! Live status: HTTP $HTTP_CODE (Build ID: $BUILD_ID)"
else
  echo "⚠️ [Warning] Health check returned HTTP $HTTP_CODE. Please verify PM2 logs."
fi

