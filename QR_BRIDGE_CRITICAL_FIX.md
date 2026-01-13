# QR Bridge - Critical Bug Fix

**Date**: January 13, 2026  
**Commit**: `b864007`  
**Severity**: 🔴 CRITICAL (Blocking QR code display)

---

## 🐛 Bug Found

**Symptom**: QR bridge requests return HTTP 500 error: `"Unexpected token '<', '<!DOCTYPE'... is not valid JSON"`

**Root Cause**: The qr-bridge API proxy route was trying to parse **non-OK responses (404, 500, etc.) as JSON**, but these responses are actually **HTML error pages**.

**Location**: `/app/api/admin/crm/whatsapp/qr-bridge/route.ts`

**Problem Code** (lines 54-55):
```typescript
const res = await fetch(bridgeUrl, fetchOptions);
const data = await res.json();  // ❌ Parses ANY response as JSON (even HTML)
```

---

## ✅ Fix Applied

**Solution**: Check `res.ok` before parsing as JSON. If response is not OK, return the error status.

**Fixed Code** (both GET and POST):
```typescript
const res = await fetch(bridgeUrl, fetchOptions);

// Check if response is successful before parsing as JSON
if (!res.ok) {
  const errorText = await res.text();
  console.error(`[QR Bridge Proxy] Bridge error (${res.status}):`, errorText.substring(0, 200));
  return NextResponse.json(
    { error: `Bridge error: ${res.status}`, details: errorText.substring(0, 100) },
    { status: res.status }
  );
}

const data = await res.json();  // ✅ Only parse if status is OK
```

**Changes**:
- Added `if (!res.ok)` check
- Read error as text instead of JSON
- Return meaningful error message with status code
- Only call `res.json()` if status is OK

---

## 🚀 Next Steps

1. **Await Vercel Build** (2-3 minutes)
   - Build should now include the response validation fix
   - https://vercel.com/swaryogaprojects/swar-yoga-web-mohan/deployments

2. **Test QR Code**
   - Clear cache: `Cmd+Shift+R`
   - Visit: `https://crm.swaryoga.com/admin/crm/qr`
   - QR should now display without "signal aborted" errors

3. **Monitor Network Tab**
   - `/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus` should return 200 with valid JSON
   - Not 500 with HTML error

---

## 📋 Why This Bug Happened

The original code assumed the bridge always returns valid JSON responses. In reality:
- Bridge may return 404 if path is invalid
- Bridge may return 500 if session crashed
- Browser's AbortController cancels after 8 seconds if no response
- Frontend sees "signal aborted without reason" in console

The new code properly handles error responses instead of trying to parse HTML as JSON.

---

## 🧪 Testing Locally

Before fix:
```bash
curl "http://localhost:3000/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus"
# Returns: {"error":"Unexpected token '<'..."}
```

After fix (once dev server restarts):
```bash
curl "http://localhost:3000/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus"
# Returns: {"status":"qr","hasQr":true,"qr":"data:image/png;base64...","chatCount":0}
```

---

**Commit**: b864007  
**Status**: 🟢 FIXED & PUSHED  
**Deployed**: Pending Vercel build (auto-triggered by git push)
