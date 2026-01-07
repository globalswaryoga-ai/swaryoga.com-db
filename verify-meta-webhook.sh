#!/bin/bash

# Meta WhatsApp Webhook Verification Script
# Tests if webhook is properly configured and receiving messages

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   META WHATSAPP WEBHOOK VERIFICATION SCRIPT                    ║"
echo "║   Testing incoming message capability                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${API_BASE:-http://localhost:3000}"
VERIFY_TOKEN="${WHATSAPP_WEBHOOK_VERIFY_TOKEN:-ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d}"
JWT_TOKEN="${JWT_TOKEN:-}"

# Helper functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

fail() {
    echo -e "${RED}❌ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test 1: Check if API is running
print_header "Test 1: API Health Check"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/admin/dashboard")
if [ "$HEALTH" = "200" ] || [ "$HEALTH" = "401" ]; then
    pass "API is running on $API_BASE"
else
    fail "API not responding. Is the server running?"
    echo "  Try: npm run dev"
    exit 1
fi

# Test 2: Check webhook status
print_header "Test 2: Webhook Status"

if [ -z "$JWT_TOKEN" ]; then
    warn "JWT_TOKEN not provided. Skipping admin endpoints."
    info "To enable full testing, set: export JWT_TOKEN=your_admin_token"
else
    STATUS=$(curl -s -X GET "$API_BASE/api/admin/crm/whatsapp/webhook-status" \
        -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.data.verifyTokenSet')
    
    if [ "$STATUS" = "true" ]; then
        pass "Webhook verify token is configured"
    else
        fail "Webhook verify token not set in .env"
        echo "  Check: WHATSAPP_WEBHOOK_VERIFY_TOKEN"
    fi
fi

# Test 3: Webhook GET verification handshake
print_header "Test 3: Webhook Verification Handshake (GET)"

CHALLENGE="test-challenge-$(date +%s)"
RESPONSE=$(curl -s "$API_BASE/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$VERIFY_TOKEN&hub.challenge=$CHALLENGE")

if [ "$RESPONSE" = "$CHALLENGE" ]; then
    pass "Webhook handshake successful - returns correct challenge"
else
    fail "Webhook handshake failed"
    echo "  Expected: $CHALLENGE"
    echo "  Got: $RESPONSE"
fi

# Test 4: Webhook POST with valid JSON (without signature)
print_header "Test 4: Webhook POST Handler (No Signature)"

TEST_PAYLOAD='{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "test-entry-123",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "919309986820",
              "phone_number_id": "733788303156745"
            },
            "messages": [
              {
                "from": "919876543210",
                "id": "wamid.test123",
                "timestamp": "1234567890",
                "type": "text",
                "text": {
                  "body": "Hello, this is a test message"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}'

HTTP_CODE=$(curl -s -o /tmp/webhook_response.json -w "%{http_code}" \
    -X POST "$API_BASE/api/whatsapp/webhook" \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD")

if [ "$HTTP_CODE" = "200" ]; then
    pass "Webhook POST handler accepted message (HTTP $HTTP_CODE)"
else
    fail "Webhook POST handler returned HTTP $HTTP_CODE"
    cat /tmp/webhook_response.json
fi

# Test 5: Check webhook events logging (if JWT available)
print_header "Test 5: Webhook Events Logging"

if [ -z "$JWT_TOKEN" ]; then
    warn "JWT_TOKEN not provided. Cannot check webhook events."
else
    EVENTS=$(curl -s -X GET "$API_BASE/api/admin/crm/whatsapp/webhook-events?limit=5" \
        -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.data.events | length')
    
    if [ "$EVENTS" -gt 0 ]; then
        pass "Webhook events are being logged ($EVENTS recent events found)"
    else
        warn "No webhook events found in database (first run?)"
    fi
fi

# Test 6: Check database connection
print_header "Test 6: Database Access"

if command -v mongo &> /dev/null; then
    MONGO_COUNT=$(mongo --quiet --eval "db.whatsapp_messages.countDocuments({})" 2>/dev/null)
    if [ -n "$MONGO_COUNT" ]; then
        pass "Database connected - found $MONGO_COUNT messages in collection"
    else
        warn "Could not connect to MongoDB"
    fi
else
    warn "MongoDB CLI not installed. Skipping database check."
fi

# Summary
print_header "Test Summary"

echo ""
echo "✅ Completed webhook verification tests"
echo ""
echo "Next steps:"
echo "  1. Send a WhatsApp message to your business number"
echo "  2. Check incoming messages appear in database"
echo "  3. View webhook events in admin panel"
echo ""
echo "To set up production testing:"
echo "  1. Update Meta callback URL to your production domain"
echo "  2. Set JWT_TOKEN for admin endpoint access"
echo "  3. Configure HTTPS endpoint in Meta app"
echo ""
