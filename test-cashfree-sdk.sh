#!/bin/bash
# test-cashfree-sdk.sh - Quick test to verify Cashfree SDK accessibility

echo "🧪 Testing Cashfree SDK Accessibility"
echo "===================================="
echo ""

# Test 1: Check DNS resolution
echo "📡 Test 1: DNS Resolution"
echo "Testing: sdk.cashfree.com"
if nslookup sdk.cashfree.com > /dev/null 2>&1; then
    echo "✅ DNS resolves correctly"
else
    echo "❌ DNS resolution failed - Check internet or ISP"
    exit 1
fi
echo ""

# Test 2: Check HTTP connectivity
echo "📡 Test 2: HTTP Connectivity (HEAD request)"
echo "Testing: https://sdk.cashfree.com/js/v3/cashfree.js"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -I https://sdk.cashfree.com/js/v3/cashfree.js 2>&1)
if [ "$RESPONSE" = "200" ]; then
    echo "✅ SDK returns 200 OK - File is accessible"
elif [ "$RESPONSE" = "000" ]; then
    echo "❌ Cannot connect to server - Network/Firewall issue"
    echo "   Try: Disable VPN, check firewall, try different network"
    exit 1
elif [ "$RESPONSE" = "403" ]; then
    echo "❌ Access denied (403) - VPN/Firewall blocking"
    echo "   Try: Disable VPN, check corporate firewall"
    exit 1
else
    echo "⚠️  Unexpected response: HTTP $RESPONSE"
    echo "   This might be a temporary issue, try again in a moment"
fi
echo ""

# Test 3: Download and verify file size
echo "📡 Test 3: File Size Verification"
echo "Testing: File size > 50KB"
FILE_SIZE=$(curl -s -I https://sdk.cashfree.com/js/v3/cashfree.js | grep -i content-length | awk '{print $2}' | tr -d '\r')
if [ ! -z "$FILE_SIZE" ]; then
    if [ "$FILE_SIZE" -gt 50000 ]; then
        echo "✅ SDK file size is $FILE_SIZE bytes (valid)"
    else
        echo "⚠️  SDK file size seems small: $FILE_SIZE bytes"
        echo "   The SDK might be incomplete or corrupted"
    fi
else
    echo "⚠️  Could not determine file size"
fi
echo ""

# Test 4: Check Content-Type
echo "📡 Test 4: Content-Type Verification"
CONTENT_TYPE=$(curl -s -I https://sdk.cashfree.com/js/v3/cashfree.js | grep -i "content-type" | awk '{print $2}')
if [[ "$CONTENT_TYPE" == *"javascript"* ]] || [[ "$CONTENT_TYPE" == *"text"* ]]; then
    echo "✅ Content-Type is correct: $CONTENT_TYPE"
else
    echo "⚠️  Content-Type might be wrong: $CONTENT_TYPE"
    echo "   Expected: application/javascript or text/javascript"
fi
echo ""

# Test 5: Check CORS headers
echo "📡 Test 5: CORS Headers (for browser requests)"
echo "Testing: Access-Control-Allow-Origin"
CORS=$(curl -s -I -H "Origin: https://swaryoga.com" https://sdk.cashfree.com/js/v3/cashfree.js | grep -i "access-control-allow-origin")
if [ ! -z "$CORS" ]; then
    echo "✅ CORS headers present: $CORS"
else
    echo "⚠️  CORS headers not present (this is normal for CDN JS files)"
fi
echo ""

# Test 6: Traceroute (if available)
if command -v traceroute &> /dev/null; then
    echo "📡 Test 6: Network Path (first 3 hops)"
    traceroute -m 3 sdk.cashfree.com 2>/dev/null | head -4
    echo ""
fi

# Summary
echo "✅ Summary: Cashfree SDK appears to be accessible"
echo ""
echo "📝 If you're still getting 'Payment gateway failed to load' error:"
echo "   1. Clear browser cache (Ctrl+Shift+Delete)"
echo "   2. Disable browser extensions (especially ad blockers)"
echo "   3. Disable VPN if active"
echo "   4. Try a different browser"
echo "   5. Try a different network (mobile hotspot)"
echo ""
echo "💡 For detailed browser diagnostics:"
echo "   1. Open DevTools: F12 or Cmd+Option+I"
echo "   2. Go to Console tab"
echo "   3. Reload the page"
echo "   4. Look for errors starting with ❌"
echo ""
