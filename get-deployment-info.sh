#!/bin/bash

echo "🔍 Checking Vercel Deployment Status..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed"
    echo "Install with: npm i -g vercel"
    exit 1
fi

# Get current project status
echo "📋 Project Information:"
vercel projects ls 2>/dev/null || echo "Run: vercel projects ls"

echo ""
echo "🌐 Your deployment URLs:"
echo "- Production: https://swar-yoga-web-mohan.vercel.app"
echo "- Custom domain: crm.swaryoga.com"

echo ""
echo "📝 To find your actual deployment:"
echo "1. Go to: https://vercel.com"
echo "2. Login to your account"
echo "3. Find project: 'swar-yoga-web-mohan'"
echo "4. Check the Deployment URL in the project dashboard"

