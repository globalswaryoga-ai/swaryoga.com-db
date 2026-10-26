#!/bin/bash
# ==============================================================================
# Zero-Downtime Safe Build for Swar Yoga
# Keeps current build safe while new Next.js build is compiling,
# preventing unstyled HTML or broken JS chunks during deployments.
# ==============================================================================

set -e
APP_DIR="/var/www/swaryoga"
cd "$APP_DIR"

echo "🚀 Starting Safe Zero-Downtime Build..."

# Step 1: Backup current working .next build
if [ -d ".next" ]; then
  echo "📦 Preserving current working build..."
  rm -rf .next-prev
  cp -r .next .next-prev
fi

# Step 2: Compile new production build with 6GB memory
echo "⚙️ Building Next.js application..."
export NODE_OPTIONS="--max-old-space-size=6144"
if npm run build; then
  echo "✅ Build completed successfully!"
  echo "🔄 Reloading PM2 with zero downtime..."
  pm2 reload swaryoga
  echo "🧹 Cleaning up previous build backup..."
  rm -rf .next-prev
  echo "🎉 Deployment finished! Site is live and fully updated."
else
  echo "🚨 Build failed! Restoring previous working build immediately..."
  if [ -d ".next-prev" ]; then
    rm -rf .next
    mv .next-prev .next
    pm2 reload swaryoga
    echo "🛡️ Previous working build restored safely. Site remains online!"
  fi
  exit 1
fi
