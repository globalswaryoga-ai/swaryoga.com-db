#!/bin/bash

# 🔍 Payment Configuration Checker Script
# Use this to verify if Cashfree is properly configured

echo "🔍 Payment Gateway Configuration Check"
echo "======================================"
echo ""

PROJECT_DIR="/Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db"
ENV_FILE="$PROJECT_DIR/.env.local"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.local not found at: $ENV_FILE"
    exit 1
fi

echo "📋 Checking Cashfree Configuration..."
echo ""

# Extract Cashfree settings
CLIENT_ID=$(grep "^CASHFREE_CLIENT_ID=" "$ENV_FILE" | cut -d'=' -f2-)
CLIENT_SECRET=$(grep "^CASHFREE_CLIENT_SECRET=" "$ENV_FILE" | cut -d'=' -f2-)
CF_ENV=$(grep "^CASHFREE_ENV=" "$ENV_FILE" | cut -d'=' -f2-)
API_VERSION=$(grep "^CASHFREE_API_VERSION=" "$ENV_FILE" | cut -d'=' -f2-)

# Display current settings
echo "Current Configuration:"
echo "  CLIENT_ID: ${CLIENT_ID:0:20}..." 
echo "  CLIENT_SECRET: ${CLIENT_SECRET:0:20}..."
echo "  ENVIRONMENT: $CF_ENV"
echo "  API_VERSION: $API_VERSION"
echo ""

# Check if credentials are placeholders
if [[ "$CLIENT_ID" == *"YOUR_"* ]] || [[ "$CLIENT_ID" == "your_"* ]]; then
    echo "❌ CLIENT_ID is a placeholder!"
    echo "   Action: Replace with real credentials from Cashfree dashboard"
    NEEDS_FIX=1
else
    echo "✅ CLIENT_ID appears to be configured"
fi

if [[ "$CLIENT_SECRET" == *"YOUR_"* ]] || [[ "$CLIENT_SECRET" == "your_"* ]]; then
    echo "❌ CLIENT_SECRET is a placeholder!"
    echo "   Action: Replace with real credentials from Cashfree dashboard"
    NEEDS_FIX=1
else
    echo "✅ CLIENT_SECRET appears to be configured"
fi

echo ""

# Check Node processes
echo "📊 Server Status:"
if pgrep -f "next dev" > /dev/null; then
    echo "✅ Next.js dev server is running"
else
    echo "⚠️  Next.js dev server is NOT running"
    echo "   Action: Run 'npm run dev' to start the server"
fi

echo ""

# Summary
if [ -z "$NEEDS_FIX" ]; then
    echo "✅ Configuration looks good!"
    echo ""
    echo "To test payment:"
    echo "  1. Navigate to: http://localhost:3000/checkout-enhanced"
    echo "  2. Click 'Pay with Cashfree'"
    echo "  3. Verify payment flow completes"
else
    echo "⚠️  Configuration needs fixing!"
    echo ""
    echo "To fix:"
    echo "  1. Get real Cashfree credentials: https://dashboard.cashfree.com/"
    echo "  2. Edit: $ENV_FILE"
    echo "  3. Replace CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET"
    echo "  4. Restart server: pkill -f 'next dev' && npm run dev"
    echo ""
    echo "For detailed guide, see: PAYMENT_AUTHENTICATION_FIX.md"
fi

echo ""
