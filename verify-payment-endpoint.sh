#!/bin/bash

# Verify /api/payments/payu/initiate endpoint is working
# This tests both localhost and production

echo "🧪 Payment Endpoint Verification Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test localhost
echo "1️⃣  Testing LOCALHOST endpoint..."
echo "   URL: http://localhost:3000/api/payments/payu/initiate"
echo ""

LOCALHOST_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/payments/payu/initiate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "amount": 100,
    "productInfo": "Test Workshop",
    "firstName": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "city": "Pune"
  }' \
  -w "\n%{http_code}")

# Split response and status code
LOCALHOST_STATUS=$(echo "$LOCALHOST_RESPONSE" | tail -1)
LOCALHOST_BODY=$(echo "$LOCALHOST_RESPONSE" | sed '$d')

echo "   Status Code: $LOCALHOST_STATUS"
echo ""

if [ "$LOCALHOST_STATUS" == "401" ]; then
  echo -e "${YELLOW}✓ Got 401 Unauthorized (expected - test token is invalid)${NC}"
  echo "  This means: Endpoint is responding correctly ✅"
  echo ""
elif [ "$LOCALHOST_STATUS" == "400" ]; then
  echo -e "${YELLOW}✓ Got 400 Bad Request${NC}"
  echo "  Response: $LOCALHOST_BODY"
  echo ""
elif [ "$LOCALHOST_STATUS" == "429" ]; then
  echo -e "${RED}✗ Got 429 Too Many Requests${NC}"
  echo "  Response: $LOCALHOST_BODY"
  echo "  Problem: Rate limiting is active on localhost!"
  echo ""
elif [ "$LOCALHOST_STATUS" == "500" ]; then
  echo -e "${RED}✗ Got 500 Internal Server Error${NC}"
  echo "  Response: $LOCALHOST_BODY"
  echo ""
else
  echo -e "${GREEN}✓ Got status $LOCALHOST_STATUS${NC}"
  echo "  Response: $LOCALHOST_BODY"
  echo ""
fi

echo ""
echo "2️⃣  Testing PRODUCTION endpoint..."
echo "   URL: https://swaryoga.com/api/payments/payu/initiate"
echo ""

PROD_RESPONSE=$(curl -s -X POST "https://swaryoga.com/api/payments/payu/initiate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "amount": 100,
    "productInfo": "Test Workshop",
    "firstName": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "city": "Pune"
  }' \
  -w "\n%{http_code}")

# Split response and status code
PROD_STATUS=$(echo "$PROD_RESPONSE" | tail -1)
PROD_BODY=$(echo "$PROD_RESPONSE" | sed '$d')

echo "   Status Code: $PROD_STATUS"
echo ""

if [ "$PROD_STATUS" == "401" ]; then
  echo -e "${GREEN}✓ Got 401 Unauthorized (expected - test token is invalid)${NC}"
  echo "  This means: Production endpoint is working correctly ✅"
  echo ""
elif [ "$PROD_STATUS" == "400" ]; then
  echo -e "${GREEN}✓ Got 400 Bad Request${NC}"
  echo "  Response: $PROD_BODY"
  echo ""
elif [ "$PROD_STATUS" == "429" ]; then
  echo -e "${RED}✗ Got 429 Too Many Requests${NC}"
  echo "  Response: $PROD_BODY"
  echo "  Problem: Rate limiting is STILL active in production!"
  echo ""
elif [ "$PROD_STATUS" == "500" ]; then
  echo -e "${RED}✗ Got 500 Internal Server Error${NC}"
  echo "  Response: $PROD_BODY"
  echo ""
else
  echo -e "${GREEN}✓ Got status $PROD_STATUS${NC}"
  echo "  Response: $PROD_BODY"
  echo ""
fi

echo ""
echo "======================================"
if [ "$LOCALHOST_STATUS" == "401" ] && [ "$PROD_STATUS" == "401" ]; then
  echo -e "${GREEN}✅ BOTH endpoints working correctly!${NC}"
  echo ""
  echo "Summary:"
  echo "  • Localhost: ✅ Ready"
  echo "  • Production: ✅ Ready"
  echo ""
  echo "The payment system should be working now."
else
  echo -e "${YELLOW}⚠️  Endpoints may have issues${NC}"
  echo ""
  echo "Localhost Status: $LOCALHOST_STATUS"
  echo "Production Status: $PROD_STATUS"
fi
