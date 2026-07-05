# QR WhatsApp Scanner Connection Issues - Troubleshooting Guide

**Issue:** Scanner couldn't log in / QR not connecting  
**Status:** 🔴 **CRITICAL** - Connection failing  
**Date:** 2026-07-05

---

## 🔍 DIAGNOSIS

### Common Failure Scenarios:

```
❌ Scenario 1: QR Code Not Showing
   → Bridge not running or not accessible
   → WHATSAPP_BRIDGE_HTTP_URL misconfigured

❌ Scenario 2: QR Shows But Won't Connect
   → Bridge not listening for connections
   → Session persistence issue
   → QR code expired (>30 seconds old)

❌ Scenario 3: Shows "Connecting..." But Times Out
   → Bridge connection blocked by firewall
   → Bridge process crashed
   → Timeout too short

❌ Scenario 4: "Cannot reach WhatsApp bridge" Error
   → Bridge URL wrong
   → Bridge crashed
   → Network issue
```

---

## 🔧 QUICK FIXES

### Fix 1: Check Bridge is Running

```bash
# Check if bridge is accessible
curl -v http://localhost:3333/status

# Expected response:
# {
#   "connected": false,
#   "status": "disconnected",
#   "hasQr": true
# }
```

**If fails:** Bridge not running or wrong URL

---

### Fix 2: Verify Bridge Configuration

**File:** `.env.local` or Vercel environment variables

```env
# Check these variables:
WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333  # LOCAL
# OR
WHATSAPP_BRIDGE_HTTP_URL=http://your-bridge-server:3333  # PRODUCTION

WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
```

**If wrong:** QR page can't reach bridge → No connection

---

### Fix 3: Start Bridge Service

```bash
# If using Baileys Bridge (Node.js)
cd path/to/whatsapp-bridge
npm install
node app.js

# Should output:
# ✅ Bridge listening on port 3333
```

---

### Fix 4: Increase Timeout

If bridge is slow, QR might expire before connecting.

**File:** `app/admin/crm/qr/page.tsx` line 129 in `fetchBridge`:

```javascript
// ❌ CURRENT (too short)
timeout: 8000,  // 8 seconds

// ✅ FIXED (longer timeout)
timeout: 30000,  // 30 seconds
```

---

### Fix 5: Force QR Refresh

```javascript
// If QR shows but expired, click "Refresh" button
// OR programmatic:
handleReconnect();  // Fetches fresh QR
```

---

## 🚨 DETAILED TROUBLESHOOTING

### Issue: "Cannot reach WhatsApp bridge"

**Diagnosis:**
```bash
# 1. Check if bridge is running
curl http://localhost:3333/status
# If: "curl: (7) Failed to connect" → Bridge not running

# 2. Check bridge URL is correct
echo $WHATSAPP_BRIDGE_HTTP_URL
# Should be: http://localhost:3333 or http://bridge-server:3333

# 3. Check firewall allows connection
telnet localhost 3333
# If: "Connection refused" → Bridge not listening

# 4. Check process is alive
ps aux | grep bridge
# Should show: "node /path/to/bridge/app.js"
```

**Solutions:**
```bash
# Start bridge if not running:
cd /path/to/whatsapp-bridge
npm start

# If getting "Address already in use":
lsof -i :3333  # See what's using port 3333
kill -9 <PID>  # Kill existing process
npm start      # Restart bridge

# If bridge crashes immediately:
node app.js    # Run without detach to see errors
# Check logs for actual error message
```

---

### Issue: "WhatsApp Not Connected" (No QR Showing)

**Diagnosis:**
```bash
# 1. Check bridge status endpoint
curl http://localhost:3333/status
# Response should have: "hasQr": true

# 2. Check if session already exists
curl http://localhost:3333/session-info
# If: authenticated session exists, use that instead

# 3. Check QR endpoint directly
curl http://localhost:3333/qr
# Should return: {"qr": "data:image/png;base64,..."}
```

**Solutions:**
```bash
# Clear old session and get fresh QR:
curl -X POST http://localhost:3333/logout
# Then refresh browser - should show new QR

# If QR endpoint gives error:
# Check bridge logs for "Failed to generate QR"
# Common cause: Puppeteer/browser issue
```

---

### Issue: QR Scans But Shows "Connecting..." Forever

**Diagnosis:**
```bash
# 1. Check if bridge received the connection
curl http://localhost:3333/status
# Should change from: "hasQr": true
#                to: "connected": true

# 2. Check if session saved
curl http://localhost:3333/session-info
# Should return authenticated session

# 3. Check bridge logs for errors
tail -f /var/log/whatsapp-bridge.log
# Look for: "Connection rejected" or "Session failed"
```

**Solutions:**
```bash
# Increase timeout (line 129 in page.tsx):
timeout: 30000  // Was 8000

# If WhatsApp blocks connection:
# - Make sure phone has internet (not on WiFi without data)
# - Wait 10 seconds between attempts
# - Try on different device
# - Check phone number is in correct format (+91XXXXXXXXXX)

# Restart bridge (fresh session):
curl -X POST http://localhost:3333/logout
curl -X POST http://localhost:3333/reconnect
```

---

## 🛠️ CODE FIXES

### Fix 1: Add Better Error Messages

**File:** `app/admin/crm/qr/page.tsx` line 936-946

```typescript
// ❌ CURRENT - Generic error
catch (e: any) {
  setError(e.message || 'Cannot reach WhatsApp bridge');
  setStatus(prev => prev || { connected: false, status: 'disconnected' });
}

// ✅ FIXED - Helpful errors
catch (e: any) {
  let friendlyMsg = e.message || 'Unknown error';
  
  if (friendlyMsg.includes('ECONNREFUSED')) {
    friendlyMsg = 'Bridge not running. Make sure Baileys bridge is started on port 3333.';
  } else if (friendlyMsg.includes('ETIMEDOUT')) {
    friendlyMsg = 'Bridge timeout. Connection took too long. Try refreshing.';
  } else if (friendlyMsg.includes('NO_BRIDGE')) {
    friendlyMsg = 'Bridge not configured. Check WHATSAPP_BRIDGE_HTTP_URL in settings.';
  } else if (friendlyMsg.includes('401')) {
    friendlyMsg = 'Bridge secret incorrect. Check WHATSAPP_BRIDGE_SECRET.';
  }
  
  setError(friendlyMsg);
  setStatus(prev => prev || { connected: false, status: 'disconnected' });
}
```

---

### Fix 2: Add Connection Retry Logic

**File:** `app/admin/crm/qr/page.tsx` line 2140-2152

```typescript
// ❌ CURRENT - No retry
const handleReconnect = useCallback(async () => {
  if (reconnectingRef.current) return;
  reconnectingRef.current = true;
  try {
    setLoading(true);
    await bridgeCall('/reconnect', 'POST');
    setTimeout(fetchStatus, 3000);
  } catch (e: any) {
    setError(e.message);
  } finally {
    setTimeout(() => { reconnectingRef.current = false; }, 5000);
  }
}, [bridgeCall, fetchStatus]);

// ✅ FIXED - With retry logic
const handleReconnect = useCallback(async () => {
  if (reconnectingRef.current) return;
  reconnectingRef.current = true;
  
  const maxAttempts = 3;
  let attempt = 0;
  let lastError = null;
  
  try {
    setLoading(true);
    
    while (attempt < maxAttempts) {
      attempt++;
      try {
        log.info(`Reconnect attempt ${attempt}/${maxAttempts}...`);
        await bridgeCall('/reconnect', 'POST');
        setError(null);
        setTimeout(fetchStatus, 3000);
        return;  // Success
      } catch (e: any) {
        lastError = e;
        if (attempt < maxAttempts) {
          // Wait before retry (exponential backoff)
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    
    // All attempts failed
    setError(lastError?.message || 'Reconnect failed after multiple attempts');
    
  } finally {
    setTimeout(() => { reconnectingRef.current = false; }, 5000);
  }
}, [bridgeCall, fetchStatus]);
```

---

### Fix 3: Improve QR Code Display

**File:** `app/admin/crm/qr/components/ConnectionTab.tsx` line 56

```typescript
// ❌ CURRENT - Basic image
<img src={qrData} alt="QR Code" className="w-64 h-64" />

// ✅ FIXED - Better handling
{qrData ? (
  <img 
    src={qrData} 
    alt="QR Code" 
    className="w-64 h-64 border-2 border-green-500 rounded-lg"
    onError={() => {
      console.error('QR image failed to load');
      setError('QR code image invalid. Refresh to try again.');
    }}
  />
) : (
  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
  </div>
)}
```

---

## 📋 CHECKLIST - Debug Session

Work through this systematically:

- [ ] **Bridge Running?**
  ```bash
  curl http://localhost:3333/status
  # Should get JSON response, not connection error
  ```

- [ ] **Bridge URL Correct?**
  ```bash
  echo $WHATSAPP_BRIDGE_HTTP_URL
  # Should match bridge actual URL
  ```

- [ ] **QR Showing?**
  ```bash
  curl http://localhost:3333/qr | head -c 100
  # Should return image data
  ```

- [ ] **QR Fresh (< 30 seconds)?**
  ```bash
  # Check timestamp in page console
  # If > 30 sec old, click Refresh
  ```

- [ ] **Phone Has Internet?**
  ```
  On the phone: Check WiFi + mobile data both work
  ```

- [ ] **Correct Phone Number Format?**
  ```
  WhatsApp Linked Devices uses +91XXXXXXXXXX format
  Not: 91XXXXXXXXXX or 0XXXXXXXXXX
  ```

- [ ] **QR Not Blurry/Pixelated?**
  ```
  Right-click QR image → "Inspect" → Check size
  Should be 256x256 or larger, not downscaled
  ```

- [ ] **Timeout Adequate?**
  ```
  Check: timeout: 30000 (in fetchBridge function)
  Default 8000ms may be too short
  ```

---

## 🚀 EMERGENCY FIX (When Everything Else Fails)

### Option 1: Use Web WhatsApp Instead

```javascript
// Temporarily fall back to WhatsApp Web
window.location.href = 'https://web.whatsapp.com';
```

### Option 2: Manual Bridge Restart

```bash
# SSH to bridge server
ssh user@bridge-server

# Kill bridge process
pkill -f "node.*bridge"

# Restart bridge
cd /path/to/bridge
npm start

# Verify
curl http://localhost:3333/status
```

### Option 3: Force Fresh Connection

```bash
# Clear all bridge data
rm -rf ~/.baileys ~/.whatsapp-web-cache

# Restart bridge
npm start

# New QR should appear
```

---

## 📞 LOGS TO CHECK

### Browser Console (DevTools → Console):
```javascript
// Look for error messages:
// "[QR Bridge] Error: ..."
// "[QR] Failed to fetch QR"
// "Cannot reach WhatsApp bridge"
```

### Bridge Logs:
```bash
# Find bridge process
ps aux | grep "bridge\|baileys\|whatsapp"

# Check its output/logs
tail -f /path/to/bridge.log

# Key errors to look for:
# - "ECONNREFUSED" = Port not listening
# - "Already in use" = Bridge already running
# - "Failed to load Chrome" = Browser issue
# - "QR timeout" = Session timeout
```

### Network Logs:
```
DevTools → Network → Filter "status" or "qr"
Should see:
- /status → 200 OK
- /qr → 200 OK (returns image)
- /reconnect → 200 OK

If 404/500: Endpoint doesn't exist in bridge
If timeout: Connection is slow
```

---

## ✅ SUCCESS INDICATORS

When working correctly, you should see:

1. **QR Displays Instantly**
   - Within 1 second of opening page

2. **QR Image Clear**
   - Not blurry or broken
   - Can scan with any QR reader

3. **Scanning Shows Feedback**
   - "Connecting..." status within 2 seconds
   - Progress indication

4. **Connection Succeeds**
   - "WhatsApp Connected" within 5-10 seconds
   - Phone number displayed
   - Chat list loads

---

**If still failing after all fixes:** Check bridge service logs for detailed error message.

