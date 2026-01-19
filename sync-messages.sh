#!/bin/bash

# Sync all bridge messages to CRM inbox
# This will log all messages sent through the WhatsApp bridge to the CRM database

CRMAPIURL="${1:-https://swaryoga.com}"
AUTHTOKEN="${2:-admincrm}"

echo "🔄 Syncing messages from WhatsApp bridge to CRM inbox..."
echo "URL: $CRMAPIURL/api/admin/crm/sync-bridge-messages"

# Make the sync request
RESPONSE=$(curl -s -X POST "$CRMAPIURL/api/admin/crm/sync-bridge-messages" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Sync complete!"
echo "Check the CRM inbox to see your messages"
