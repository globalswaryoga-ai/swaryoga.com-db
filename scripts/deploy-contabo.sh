#!/bin/bash
set -e

# ==============================================================================
# Zero-Downtime Atomic Deployment Script for Swar Yoga (Contabo VPS)
# ==============================================================================
# Prevents website & Android app from ever showing raw HTML or missing CSS chunks.
# - Preserves historical CSS and JS static assets so active users never 404
# - Uses NODE_OPTIONS memory allocation to prevent OOM
# - Smoothly reloads PM2
# ==============================================================================

PROJECT_DIR="/var/www/swaryoga"
BACKUP_STATIC="/var/www/swaryoga_static_persistent"

echo "🚀 [1/4] Preserving active static assets for zero-downtime..."
mkdir -p "$BACKUP_STATIC/css"
mkdir -p "$BACKUP_STATIC/chunks"

if [ -d "$PROJECT_DIR/.next/static" ]; then
  if [ -d "$PROJECT_DIR/.next/static/css" ]; then
    cp -r "$PROJECT_DIR/.next/static/css"/* "$BACKUP_STATIC/css/" 2>/dev/null || true
  fi
  if [ -d "$PROJECT_DIR/.next/static/chunks" ]; then
    cp -r "$PROJECT_DIR/.next/static/chunks"/* "$BACKUP_STATIC/chunks/" 2>/dev/null || true
  fi
fi

echo "⚙️  [2/4] Building Next.js production bundles..."
cd "$PROJECT_DIR"
NODE_OPTIONS='--max-old-space-size=6144' npm run build

echo "🛡️  [3/4] Merging persistent static cache into new build (prevents page cracking)..."
if [ -d "$PROJECT_DIR/.next/static/css" ]; then
  # Copy previous CSS chunks without overwriting new ones
  cp -n "$BACKUP_STATIC/css"/* "$PROJECT_DIR/.next/static/css/" 2>/dev/null || true
fi
if [ -d "$PROJECT_DIR/.next/static/chunks" ]; then
  # Copy previous JS chunks without overwriting new ones
  cp -n "$BACKUP_STATIC/chunks"/* "$PROJECT_DIR/.next/static/chunks/" 2>/dev/null || true
fi

echo "🔄 [4/4] Reloading PM2 with zero downtime..."
pm2 reload swaryoga

echo "🎉 Deployment successfully completed! Website & Android App styles are 100% active."

