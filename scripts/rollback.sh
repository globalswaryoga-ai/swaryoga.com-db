#!/bin/bash
set -e

# ==============================================================================
# SwarYoga Instant Rollback Script
# ==============================================================================

PROJECT_DIR="/var/www/swaryoga"
cd "$PROJECT_DIR"

LATEST_SNAPSHOT=$(ls -dt .next_snapshots/snapshot_* 2>/dev/null | head -n 1)

if [ -z "$LATEST_SNAPSHOT" ]; then
  echo "❌ No snapshot found in .next_snapshots!"
  exit 1
fi

echo "⏪ [Rollback] Restoring previous snapshot: $LATEST_SNAPSHOT..."
rm -rf .next
cp -r "$LATEST_SNAPSHOT" .next
pm2 reload swaryoga --update-env
echo "✅ [Rollback OK] Rollback complete and PM2 reloaded!"

