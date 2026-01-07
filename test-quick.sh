#!/bin/bash

# 🚀 QUICK TERMINAL TEST - One Line Check
# Run this to instantly verify incoming messages are working

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   INCOMING MESSAGES - QUICK TERMINAL CHECK                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if server is running
echo "1️⃣  Checking if server is running..."
if curl -s http://localhost:3004/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Server is running${NC}"
else
  echo -e "${RED}❌ Server is NOT running${NC}"
  echo "   Fix: Run 'npm run dev' in another terminal"
  exit 1
fi

# 2. Generate token
echo ""
echo "2️⃣  Generating JWT token..."
TOKEN_OUTPUT=$(node generate-jwt-token.js 2>/dev/null | grep "^eyJ" | head -1)

if [ -z "$TOKEN_OUTPUT" ]; then
  echo -e "${RED}❌ Could not generate token${NC}"
  exit 1
else
  TOKEN=$TOKEN_OUTPUT
  echo -e "${GREEN}✅ Token generated${NC}"
  echo "   Token: ${TOKEN:0:30}..."
fi

# 3. Test API with token
echo ""
echo "3️⃣  Testing API with token..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3004/api/admin/crm/whatsapp/meta/conversations \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✅ API accepts token (200 OK)${NC}"
  CONV_COUNT=$(echo "$BODY" | grep -o '"_id"' | wc -l)
  echo "   Conversations in DB: $CONV_COUNT"
else
  echo -e "${RED}❌ API returned $STATUS${NC}"
  exit 1
fi

# 4. Check database
echo ""
echo "4️⃣  Checking database..."
if [ "$CONV_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Database has messages${NC}"
  echo "   Total: $CONV_COUNT conversations"
else
  echo -e "${YELLOW}⚠️  No conversations yet${NC}"
  echo "   (This is OK - send a test message first)"
fi

# 5. Summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "RESULT:"
echo "════════════════════════════════════════════════════════════════"

if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}🎉 SUCCESS! Incoming messages are working!${NC}"
  echo ""
  echo "To test it:"
  echo "  1. Send a WhatsApp message to your number"
  echo "  2. Go to: https://crm.swaryoga.com/admin/crm/whatsapp-meta"
  echo "  3. Message should appear within 10 seconds ✅"
  echo ""
else
  echo -e "${RED}❌ Something is broken - see details above${NC}"
  exit 1
fi
