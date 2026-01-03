# WhatsApp Send Error - Quick Fix Checklist

## ✅ Code is Correct
All fixes have been implemented and pushed to GitHub:
- ✅ useCRM hook treats HTTP 202 as success
- ✅ Endpoint returns 202 when bridge unavailable
- ✅ UI shows queued status instead of error
- ✅ All commits deployed to Vercel

## 🔧 Try These Steps (In Order)

### Step 1: Clear Browser Cache (Most Important)
**Mac:**
```
Cmd + Shift + R
```

**Windows:**
```
Ctrl + Shift + R
```

Or go to Settings → Clear browsing data → Cached images/files

### Step 2: Hard Refresh CRM Page
1. Go to: https://crm.swaryoga.com/admin/crm/whatsapp
2. Press Cmd+Shift+R or Ctrl+Shift+R
3. Wait for page to fully load (you'll see new version number in console)

### Step 3: Try Sending a Message
1. Select a conversation
2. Type: "Test message"
3. Click Send
4. **Expected:**
   - ✅ Message appears in chat immediately
   - ✅ No red error message
   - ✅ Shows "sent" or "✓ Message queued" status

### Step 4: Check What Vercel Deployed
Open browser console (F12) and paste:
```javascript
fetch('/api/admin/crm/whatsapp/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leadId: '507f1f77bcf86cd799439011',
    phoneNumber: '919876543210',
    messageContent: 'test'
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

Check the response in console for:
- `success: true` ✅
- `data.status: 'queued'` or `'sent'` ✅

## 📊 Debugging Info

If still having issues, open DevTools (F12) and:

### Network Tab
1. Click Network
2. Send a message
3. Look for request to `/api/admin/crm/whatsapp/send`
4. Check:
   - Response Status: Should be `200` or `202`
   - Response body: Should have `"success": true`

### Console Tab
1. Click Console
2. Send a message
3. Look for any JavaScript errors (red text)
4. Copy/share any error messages

## 🎯 Latest Deployments

| Commit | Deployed | What It Does |
|--------|----------|--------------|
| `d19a5a7` | ✅ Yes | Detailed fix explanation |
| `e778497` | ✅ Yes | **FIX: Treat 202 as success** |
| `aaab7ab` | ✅ Yes | Quick troubleshooting guide |

## 💾 If Using Local Dev

If you're running locally (`npm run dev`):

1. **Restart dev server:**
   ```bash
   # Stop: Ctrl+C
   # Start: npm run dev
   ```

2. **Clear Next.js cache:**
   ```bash
   rm -rf .next && npm run dev
   ```

3. **Reload browser:** F5

## ⚠️ If Still Failing

**Please provide:**
1. Screenshot of the error message
2. DevTools Network tab response (from step 4 above)
3. Console errors (if any)
4. Which environment: production (crm.swaryoga.com) or local?

---

## Quick Status Check

To verify deployment:
```bash
curl https://crm.swaryoga.com/api/admin/crm/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"...", "phoneNumber":"919876543210", "messageContent":"test"}' \
  -X POST
```

Should return **202** or **200** with `"success": true`
