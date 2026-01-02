#!/bin/bash

# Add WhatsApp Bridge environment variables to Vercel Production

PROJECT_ID="prj_cP6zoqQKVVxQUAilShHyGFeFyHuI"

echo "Adding WhatsApp Bridge environment variables to Vercel..."

# Get Vercel token from environment or stored auth
VERCEL_TOKEN=$(vercel whoami --token 2>/dev/null || echo "")

if [ -z "$VERCEL_TOKEN" ]; then
  echo "Getting auth token from Vercel..."
  VERCEL_AUTH=$(cat ~/.vercel/auth.json 2>/dev/null | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  VERCEL_TOKEN=$VERCEL_AUTH
fi

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ Could not find Vercel auth token. Try: vercel login"
  exit 1
fi

echo "✓ Using Vercel token"

# Add WHATSAPP_BRIDGE_HTTP_URL
curl -s -X POST \
  "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "WHATSAPP_BRIDGE_HTTP_URL",
    "value": "https://wa-bridge.swaryoga.com",
    "target": ["production"]
  }' | jq . && echo "✓ WHATSAPP_BRIDGE_HTTP_URL added"

# Add NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL
curl -s -X POST \
  "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL",
    "value": "https://wa-bridge.swaryoga.com",
    "target": ["production"]
  }' | jq . && echo "✓ NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL added"

# Add NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL
curl -s -X POST \
  "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL",
    "value": "wss://wa-bridge.swaryoga.com",
    "target": ["production"]
  }' | jq . && echo "✓ NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL added"

echo ""
echo "✅ All environment variables added to Vercel!"
echo ""
echo "Next: Deploy to apply changes:"
echo "  vercel --prod"
