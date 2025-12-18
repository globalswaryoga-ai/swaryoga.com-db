#!/bin/bash

# MongoDB & Application Health Monitoring Script
# This script checks the status of the application and MongoDB connection

echo "🔍 Swar Yoga Application Health Monitor"
echo "======================================"
echo ""

# Check environment variables
echo "📋 Environment Configuration:"
if [ -f ".env.local" ]; then
  echo "✅ .env.local found"
  if grep -q "MONGODB_URI" .env.local; then
    echo "✅ MONGODB_URI is set"
  else
    echo "❌ MONGODB_URI is NOT set"
  fi
  if grep -q "JWT_SECRET" .env.local; then
    echo "✅ JWT_SECRET is set"
  else
    echo "❌ JWT_SECRET is NOT set"
  fi
  if grep -q "ADMIN_PASSWORD" .env.local; then
    echo "✅ ADMIN_PASSWORD is set"
  else
    echo "❌ ADMIN_PASSWORD is NOT set"
  fi
else
  echo "❌ .env.local NOT found"
fi

echo ""
echo "🚀 Server Status:"

# Check if server is running on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "✅ Server is running on port 3000"
  
  echo ""
  echo "📡 API Health Check:"
  
  # Check health endpoint
  RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health/status)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health endpoint responding (HTTP $HTTP_CODE)"
    echo ""
    echo "Database Connection Status:"
    echo "$BODY" | jq '.mongodb' 2>/dev/null || echo "$BODY"
  else
    echo "❌ Health endpoint failed (HTTP $HTTP_CODE)"
  fi
else
  echo "❌ Server is NOT running on port 3000"
  echo "Start the server with: npm run dev"
fi

echo ""
echo "======================================"
echo "Monitor Complete - $(date)"
