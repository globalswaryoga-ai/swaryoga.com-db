#!/bin/bash
#
# Start WhatsApp Bridge Health Monitor
# This script ensures the bridge health monitoring daemon is running
# Run this in your deployment environment or via cron
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MONITOR_SCRIPT="$SCRIPT_DIR/bridge-health-monitor.js"
LOG_FILE="$PROJECT_ROOT/logs/bridge-monitor.log"
PID_FILE="$PROJECT_ROOT/.bridge-monitor.pid"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 WhatsApp Bridge Health Monitor Startup${NC}"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
  exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Check if monitor is already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Monitor already running (PID: $OLD_PID)${NC}"
    echo ""
    echo "To stop: kill $OLD_PID"
    echo "To view logs: tail -f $LOG_FILE"
    exit 0
  else
    echo -e "${YELLOW}⚠️  Stale PID file found, removing...${NC}"
    rm "$PID_FILE"
  fi
fi

echo "Starting bridge health monitor..."
echo ""

# Start the monitor in background
nohup node "$MONITOR_SCRIPT" > "$LOG_FILE" 2>&1 &
MONITOR_PID=$!

# Save PID
echo $MONITOR_PID > "$PID_FILE"

# Wait a moment for startup
sleep 2

# Check if it's still running
if ps -p "$MONITOR_PID" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Bridge health monitor started successfully${NC}"
  echo ""
  echo "📊 Monitor Details:"
  echo "   PID: $MONITOR_PID"
  echo "   Log file: $LOG_FILE"
  echo "   Status file: $PROJECT_ROOT/.bridge-status"
  echo ""
  echo "📋 View logs:"
  echo "   tail -f $LOG_FILE"
  echo ""
  echo "🛑 To stop the monitor:"
  echo "   kill $MONITOR_PID"
  echo ""
  echo "📈 What the monitor does:"
  echo "   • Checks bridge health every 30 seconds"
  echo "   • Auto-restarts bridge if it goes down (3+ consecutive failures)"
  echo "   • Logs all activity to $LOG_FILE"
  echo "   • Updates status file: $PROJECT_ROOT/.bridge-status"
  echo ""
else
  echo -e "${RED}❌ Failed to start bridge health monitor${NC}"
  echo ""
  echo "Check the log file for details:"
  tail -20 "$LOG_FILE"
  rm "$PID_FILE"
  exit 1
fi
