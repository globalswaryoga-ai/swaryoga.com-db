#!/bin/bash

# WhatsApp Bridge Auto-Repair System - Quick Start

echo "🚀 WhatsApp Bridge Auto-Repair System Setup"
echo "=============================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Create logs directory
mkdir -p logs
echo "✅ Logs directory ready"
echo ""

# Start the bridge health monitor
echo "🔄 Starting Bridge Health Monitor..."
echo ""
echo "This will:"
echo "  • Monitor bridge health every 30 seconds"
echo "  • Auto-restart bridge if it goes down"
echo "  • Maintain QR code freshness"
echo "  • Log all activity to logs/bridge-health.log"
echo ""
echo "Press Ctrl+C to stop the monitor"
echo "-------------------------------------------"
echo ""

# Run the monitor
node scripts/bridge-health-monitor.js
