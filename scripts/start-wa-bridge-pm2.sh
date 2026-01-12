#!/usr/bin/env bash
set -euo pipefail

# Helper to start the wa-bridge using PM2.
# Usage:
#   bash scripts/start-wa-bridge-pm2.sh --cwd /home/ubuntu/swaryoga.com-db/services/whatsapp-web
# If --cwd is omitted the script will use the repo relative services/whatsapp-web path.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_CWD="$REPO_ROOT/services/whatsapp-web"

while [[ $# -gt 0 ]]; do
  case $1 in
    --cwd)
      shift
      PM2_CWD="$1"
      shift
      ;;
    --yes)
      YES=1
      shift
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

PM2_CWD=${PM2_CWD:-$DEFAULT_CWD}

echo "Using wa-bridge cwd: $PM2_CWD"

cd "$PM2_CWD"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found. Installing pm2 globally (requires sudo)"
  sudo npm install -g pm2
fi

# Ensure node_modules exist (production). If you want dev deps for debugging remove --production
if [ ! -d "node_modules" ]; then
  echo "node_modules missing — running npm install (production)"
  npm install --production
fi

# Export an env var that the ecosystem file can read to set the correct cwd
export PM2_WA_BRIDGE_CWD="$PM2_CWD"

echo "Starting wa-bridge with PM2 (passing current env)..."
# Use --update-env so exported env vars in the current shell are applied to the PM2 process
pm2 start "$PM2_CWD/ecosystem.config.cjs" --env production --update-env

echo "Saving PM2 process list and generating startup script..."
pm2 save

echo "Configuring PM2 to start on system boot..."
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS uses launchd/launchctl
  echo "Detected macOS — setting up launchd startup for pm2"
  pm2 startup launchd -u $(whoami) --hp $HOME
else
  # default to systemd for Linux
  pm2 startup systemd -u $(whoami) --hp $HOME
fi

echo "Done. Check logs with: pm2 logs wa-bridge --lines 200"
