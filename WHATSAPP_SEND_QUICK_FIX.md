# WhatsApp Send Error - Quick Troubleshooting

## If You See: "Failed to send message"

### Step 1: Check if Message Was Saved
✅ **Good news:** Even if you see an error, your message was likely saved to the database!

1. Go to CRM: https://crm.swaryoga.com/admin/crm/whatsapp
2. Select the conversation
3. **Look at the chat** - does your message appear?
   - **YES** → Message was saved ✅ (even if error shown)
   - **NO** → Real error, see Step 2

### Step 2: Check Bridge Status
The error usually means the WhatsApp bridge is unavailable.

1. In CRM, look for **"QR Connection Status"** widget
   - **Connected** 🟢 → Bridge is online
   - **Disconnected** 🔴 → Bridge is offline

### Step 3: If Bridge is Offline
The message will be sent automatically when bridge comes back online!

**What happens:**
1. Message is queued in database
2. You'll see: "✓ Message queued - Bridge offline"
3. Wait 2-5 minutes for bridge to restart
4. Message sends automatically
5. Status updates to "sent"

### Step 4: Force Manual Retry
If message doesn't send after 10 minutes:

1. Delete your message in chat
2. Send it again
3. This creates a new attempt in the queue

## Common Error Messages

### "Message queued - Bridge unavailable"
**Status:** ✅ OK (not an error!)  
**Action:** Wait for bridge to come online  
**Timeline:** Usually 2-5 minutes

### "Message queued - Bridge offline"  
**Status:** ✅ OK (not an error!)  
**Action:** Same as above

### "Failed to send message"
**Status:** ❌ Real error  
**Action:** Try the steps above

### "Lead not found"
**Cause:** Lead ID missing or invalid  
**Action:** Select a conversation first, then send

### "Invalid phoneNumber"
**Cause:** Phone number format issue  
**Action:** Use format: `+91 9876543210` or `919876543210`

## Testing If It Works

1. **Open WhatsApp on phone**
   - Use account: **919075358557**
   - Send a test message to someone

2. **In CRM**
   - Go to their conversation
   - Type: "Hello from CRM"
   - Click Send

3. **Expected result**
   - Message appears in chat ✅
   - Shows as "sent" or "queued" ✅
   - No red error ✅

## If Still Failing

1. **Check browser console** (F12 → Console tab)
   - Look for JavaScript errors
   - Copy any error messages

2. **Check network tab** (F12 → Network tab)
   - Send a message
   - Look for API requests
   - Check response status codes

3. **Restart CRM**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - This clears cache and loads latest code

## Admin: Monitor Bridge Health

### Check Bridge Logs
```bash
docker logs wa-bridge-wa-bridge -f
```

### Restart Bridge if Needed
```bash
docker restart wa-bridge-wa-bridge
```

### View Queued Messages
MongoDB query:
```javascript
db.whatsappmessages.find({ status: 'queued' }).sort({ createdAt: -1 })
```

## Key Points to Remember

✅ **Messages never get lost** - they queue in database  
✅ **"Queued" is not an error** - it's a success state  
✅ **Bridge failures are temporary** - usually 2-5 minutes  
✅ **Messages send automatically** - when bridge comes online  

## Still Have Issues?

Check: `WHATSAPP_SEND_ERROR_RESOLUTION.md` for detailed technical information
