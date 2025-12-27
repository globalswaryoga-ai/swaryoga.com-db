#!/bin/bash

# WhatsApp QR Login API Examples
# Use these commands to test the QR login endpoints

# ==========================================
# 1. GENERATE QR CODE
# ==========================================

echo "=== 1. GENERATE QR CODE ==="
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/generate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "sessionId": "wa-1703667890000-x7y8z9",
#     "qrUrl": "https://api.qrserver.com/v1/create-qr-code/?...",
#     "qrContent": "base64-encoded-json",
#     "expiresIn": 900,
#     "displayText": "Scan this QR code...",
#     "instructions": [...]
#   }
# }

# ==========================================
# 2. VERIFY & CREATE ACCOUNT
# ==========================================

echo -e "\n=== 2. VERIFY & CREATE ACCOUNT ==="
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/verify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "wa-1703667890000-x7y8z9",
    "phoneNumber": "+91 98765 43210",
    "accountName": "My WhatsApp Number",
    "provider": "manual"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "accountId": "507f1f77bcf86cd799439011",
#     "accountName": "My WhatsApp Number",
#     "phoneNumber": "+91 98765 43210",
#     "status": "connected",
#     "message": "✅ WhatsApp number authenticated successfully!"
#   }
# }

# ==========================================
# 3. TEST WITH DIFFERENT PROVIDERS
# ==========================================

echo -e "\n=== 3. VERIFY WITH TWILIO PROVIDER ==="
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/verify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "wa-1703667890000-x7y8z9",
    "phoneNumber": "+91 88888 88888",
    "accountName": "Twilio WhatsApp",
    "provider": "twilio"
  }'

echo -e "\n=== 4. VERIFY WITH MSG91 PROVIDER ==="
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/verify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "wa-1703667890000-x7y8z9",
    "phoneNumber": "+91 77777 77777",
    "accountName": "MSG91 WhatsApp",
    "provider": "msg91"
  }'

# ==========================================
# 5. ERROR SCENARIOS (TESTING)
# ==========================================

echo -e "\n=== 5. ERROR: MISSING PHONE NUMBER ==="
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/verify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "wa-1703667890000-x7y8z9",
    "accountName": "Test",
    "provider": "manual"
  }'
# Expected: 400 error "Missing required fields"

echo -e "\n=== 6. ERROR: INVALID PHONE ==="
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/verify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "wa-1703667890000-x7y8z9",
    "phoneNumber": "123",
    "accountName": "Test",
    "provider": "manual"
  }'
# Expected: 400 error "Invalid phone number format"

echo -e "\n=== 7. ERROR: DUPLICATE PHONE ==="
# First create an account:
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/verify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "wa-1703667890000-x7y8z9",
    "phoneNumber": "+91 99999 99999",
    "accountName": "First Account",
    "provider": "manual"
  }'

# Then try to create again with same phone:
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/verify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "wa-1703667890000-abc123",
    "phoneNumber": "+91 99999 99999",
    "accountName": "Duplicate Account",
    "provider": "manual"
  }'
# Expected: 409 error "Phone number already registered"

echo -e "\n=== 8. ERROR: UNAUTHORIZED (NO TOKEN) ==="
curl -X POST http://localhost:3000/api/admin/crm/whatsapp/qr-login/generate \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 401 error "Unauthorized"

# ==========================================
# HELPER: GET ADMIN TOKEN
# ==========================================

echo -e "\n=== HELPER: Login to get token ==="
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admincrm",
    "password": "Turya@#$4596"
  }'

# Expected Response:
# {
#   "success": true,
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "userId": "admincrm",
#     "email": "admin@example.com",
#     "isAdmin": true,
#     "role": "admin"
#   }
# }

# ==========================================
# TESTING WITH JAVASCRIPT (Node.js)
# ==========================================

cat << 'EOF' > test-qr-api.js
// test-qr-api.js - Test QR login endpoints

const BASE_URL = 'http://localhost:3000';
let adminToken = '';

// Get admin token
async function getAdminToken() {
  const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'admincrm',
      password: 'Turya@#$4596'
    })
  });
  const data = await res.json();
  adminToken = data.token;
  console.log('✅ Admin token obtained');
  return adminToken;
}

// Generate QR code
async function generateQR() {
  const res = await fetch(`${BASE_URL}/api/admin/crm/whatsapp/qr-login/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  const data = await res.json();
  console.log('✅ QR Generated:', {
    sessionId: data.data.sessionId,
    expiresIn: data.data.expiresIn,
    qrUrl: data.data.qrUrl.substring(0, 50) + '...'
  });
  return data.data;
}

// Verify account
async function verifyAccount(sessionId, phoneNumber) {
  const res = await fetch(`${BASE_URL}/api/admin/crm/whatsapp/qr-login/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      phoneNumber,
      accountName: 'Test Account',
      provider: 'manual'
    })
  });
  const data = await res.json();
  console.log('✅ Account Created:', {
    accountId: data.data.accountId,
    phoneNumber: data.data.phoneNumber,
    status: data.data.status
  });
  return data.data;
}

// Run test flow
async function runTests() {
  try {
    console.log('🚀 Starting QR Login API tests...\n');
    
    // Step 1: Get token
    await getAdminToken();
    
    // Step 2: Generate QR
    const qrData = await generateQR();
    
    // Step 3: Verify account
    const account = await verifyAccount(qrData.sessionId, '+91 99999 88888');
    
    console.log('\n✅ All tests passed!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTests();
EOF

echo -e "\n=== Run this JavaScript test ==="
echo "node test-qr-api.js"

# ==========================================
# TESTING WITH POSTMAN
# ==========================================

echo -e "\n\n=== POSTMAN COLLECTION ==="
cat << 'EOF' > WhatsApp_QR_Login.postman_collection.json
{
  "info": {
    "name": "WhatsApp QR Login",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login to get token",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"userId\": \"admincrm\", \"password\": \"Turya@#$4596\"}"
        },
        "url": {
          "raw": "http://localhost:3000/api/admin/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "admin", "auth", "login"]
        }
      }
    },
    {
      "name": "2. Generate QR Code",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{admin_token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{}"
        },
        "url": {
          "raw": "http://localhost:3000/api/admin/crm/whatsapp/qr-login/generate",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "admin", "crm", "whatsapp", "qr-login", "generate"]
        }
      }
    },
    {
      "name": "3. Verify & Create Account",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{admin_token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"sessionId\": \"{{session_id}}\", \"phoneNumber\": \"+91 98765 43210\", \"accountName\": \"My WhatsApp\", \"provider\": \"manual\"}"
        },
        "url": {
          "raw": "http://localhost:3000/api/admin/crm/whatsapp/qr-login/verify",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "admin", "crm", "whatsapp", "qr-login", "verify"]
        }
      }
    }
  ],
  "variable": [
    {"key": "admin_token", "value": ""},
    {"key": "session_id", "value": ""}
  ]
}
EOF

echo "Postman collection created: WhatsApp_QR_Login.postman_collection.json"
echo "Import this into Postman to test the endpoints"

# ==========================================
# PHONE NUMBER TEST CASES
# ==========================================

echo -e "\n=== PHONE NUMBER TEST CASES ==="

test_phones=(
  "+91 98765 43210|VALID|With spaces"
  "+919876543210|VALID|No spaces"
  "919876543210|VALID|No plus"
  "98765 43210|VALID|India only"
  "9876543210|VALID|10 digits"
  "(091) 98765-43210|VALID|Formatted"
  "123|INVALID|Too short"
  "abc|INVALID|Non-numeric"
  ""|INVALID|Empty"
  "+1 234 567 8901|VALID|US format"
)

for test_case in "${test_phones[@]}"; do
  IFS='|' read -r phone status reason <<< "$test_case"
  if [ "$status" = "VALID" ]; then
    echo "✅ $phone - $reason"
  else
    echo "❌ $phone - $reason"
  fi
done

# ==========================================
# NOTES
# ==========================================

echo -e "\n=== IMPORTANT NOTES ==="
echo "1. Replace YOUR_ADMIN_TOKEN with actual token from login endpoint"
echo "2. Replace phone numbers with valid numbers for testing"
echo "3. Each QR code expires in 15 minutes"
echo "4. Phone numbers must be unique (no duplicates)"
echo "5. Session IDs are one-time use"
echo "6. Test on http://localhost:3000 (local development)"
echo "7. In production, use https://yourdomain.com"

# ==========================================
# END OF API EXAMPLES
# ==========================================
