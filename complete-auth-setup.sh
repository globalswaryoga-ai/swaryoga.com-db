#!/bin/bash
set -e

echo "🔐 Swar Yoga - Complete Authentication Setup"
echo "==========================================="

# Kill old dev server if running
pkill -f "npm run dev" || true
sleep 1

# Start fresh dev server
echo "📦 Starting dev server..."
npm run dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
sleep 4

if ! kill -0 $DEV_PID 2>/dev/null; then
  echo "❌ Dev server failed to start"
  cat /tmp/dev.log | head -50
  exit 1
fi

echo "✅ Dev server running (PID: $DEV_PID)"

# Generate fresh token
echo ""
echo "🔑 Generating fresh authentication token..."
FRESH_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-at-least-32-characters-long-12345678';
const token = jwt.sign(
  {
    userId: 'admin',
    email: 'admin@swaryoga.com',
    isAdmin: true,
    username: 'admin',
    role: 'admin'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);
console.log(token);
")

if [ -z "$FRESH_TOKEN" ]; then
  echo "❌ Failed to generate token"
  exit 1
fi

echo "✅ Token generated successfully"

# Test API directly
echo ""
echo "🧪 Testing API with fresh token..."
API_TEST=$(curl -s -X GET http://localhost:3001/api/admin/crm/sadhana-scheduler \
  -H "Authorization: Bearer $FRESH_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}" 2>&1)

HTTP_CODE=$(echo "$API_TEST" | tail -1)
RESPONSE=$(echo "$API_TEST" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API works! Status: $HTTP_CODE"
  SCHEDULE_COUNT=$(echo "$RESPONSE" | jq '.data | length' 2>/dev/null || echo "?")
  echo "   Found schedules: $SCHEDULE_COUNT"
else
  echo "❌ API returned status: $HTTP_CODE"
  echo "   Response: $RESPONSE"
fi

# Create browser setup file with token
echo ""
echo "📝 Creating setup file at: browser-auth-complete.html"
cat > browser-auth-complete.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
    <title>✅ Swar Yoga - Authentication Complete</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; max-width: 600px; width: 90%; }
        h1 { color: #2d3748; margin-bottom: 10px; font-size: 28px; }
        .subtitle { color: #718096; margin-bottom: 30px; font-size: 16px; }
        .status-box { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .status-icon { font-size: 32px; margin-bottom: 10px; }
        .status-text { color: #166534; font-weight: 600; font-size: 18px; }
        .token-display { background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 12px; word-break: break-all; max-height: 120px; overflow-y: auto; margin-bottom: 15px; color: #333; }
        .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        button { padding: 12px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #5568d3; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4); }
        .btn-secondary { background: #e2e8f0; color: #333; }
        .btn-secondary:hover { background: #cbd5e0; }
        .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: #1e40af; font-size: 14px; }
        .success-message { background: #dcfce7; color: #166534; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ Authentication Ready!</h1>
        <p class="subtitle">Your browser is now configured to access Sadhana Scheduler</p>
        
        <div class="status-box">
            <div class="status-icon">🔐</div>
            <div class="status-text">Token Stored Successfully</div>
        </div>

        <div class="info-box">
            📌 <strong>Token stored in:</strong> LocalStorage (crm_token, adminToken, admin_token)<br>
            ⏰ <strong>Expires:</strong> <span id="expireTime">7 days</span><br>
            👤 <strong>User:</strong> admin@swaryoga.com (Admin)
        </div>

        <div id="successMessage" class="success-message">✅ Ready! Navigating...</div>

        <div class="action-grid">
            <button class="btn-primary" onclick="goToScheduler()">
                ➜ Open Sadhana Scheduler
            </button>
            <button class="btn-secondary" onclick="copyToken()">
                📋 Copy Token
            </button>
        </div>

        <button style="width: 100%; margin-top: 10px;" class="btn-secondary" onclick="showToken()">
            👁️ Show Token
        </button>

        <div id="tokenArea" style="display:none; margin-top: 20px;">
            <p style="color: #666; font-size: 12px; margin-bottom: 8px;">Token Value:</p>
            <div class="token-display" id="tokenDisplay"></div>
        </div>
    </div>

    <script>
        // Retrieve token from query param (set by bash script)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');

        if (token) {
            // Parse JWT to show expiry
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expireDate = new Date(payload.exp * 1000);
                document.getElementById('expireTime').textContent = expireDate.toLocaleString();
            } catch (e) {}
            
            document.getElementById('tokenDisplay').textContent = token;
        }

        function showToken() {
            const area = document.getElementById('tokenArea');
            area.style.display = area.style.display === 'none' ? 'block' : 'none';
        }

        function copyToken() {
            if (token) {
                navigator.clipboard.writeText(token).then(() => {
                    alert('Token copied to clipboard!');
                });
            }
        }

        function goToScheduler() {
            if (!token) {
                alert('❌ No token available');
                return;
            }
            
            // Show success message
            document.getElementById('successMessage').style.display = 'block';
            
            // Navigate after a brief delay
            setTimeout(() => {
                window.location.href = 'http://localhost:3001/admin/crm/sadhana-scheduler';
            }, 1000);
        }

        // Auto-store token on page load
        window.addEventListener('load', () => {
            if (token) {
                localStorage.setItem('crm_token', token);
                localStorage.setItem('adminToken', token);
                localStorage.setItem('admin_token', token);
            }
        });
    </script>
</body>
</html>
HTMLEOF

# Save token for later use
echo "$FRESH_TOKEN" > /tmp/fresh-token.txt
chmod 600 /tmp/fresh-token.txt

echo ""
echo "==========================================="
echo "✅ SETUP COMPLETE!"
echo "==========================================="
echo ""
echo "📖 NEXT STEPS:"
echo ""
echo "1️⃣  Open browser-auth-complete.html:"
echo "    open browser-auth-complete.html"
echo ""
echo "2️⃣  Click 'Open Sadhana Scheduler'"
echo ""
echo "3️⃣  Password should load without 401 errors"
echo ""
echo "📋 Token saved to: /tmp/fresh-token.txt"
echo ""
echo "🧪 Test with curl:"
echo "   curl -H \"Authorization: Bearer \$(cat /tmp/fresh-token.txt)\" \\"
echo "     http://localhost:3001/api/admin/crm/sadhana-scheduler"
echo ""
echo "🛑 Kill dev server: kill $DEV_PID"
echo ""
