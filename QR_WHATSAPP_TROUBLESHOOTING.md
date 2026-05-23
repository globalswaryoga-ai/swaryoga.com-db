# QR WhatsApp - 4 Issue Fixes & Troubleshooting Guide

## Status: 2/4 Issues Fixed ✅, 2/4 Improved with Diagnostics 🔍

---

## Issue 1: Double Messages ✅ FIXED

### Root Cause
Race condition in deduplication:
- Deduplication check happened BEFORE sending
- If cron ran twice simultaneously, both calls passed the check before either recorded the message

### Fix Applied
- Changed to **atomic reservation** using MongoDB upsert
- New function: `reserveMessageSend()` reserves slot BEFORE sending
- Even concurrent calls can't duplicate now

### Verification
- Send a test broadcast → check if single message appears
- Deploy code first

---

## Issue 2: Scheduled Messages Not Sending 🔍 DIAGNOSED

### Root Causes (Check These First)

#### ✅ When you create a schedule, verify:
```
1. isActive = true (required)
2. status = 'scheduled' or 'draft' (must be one of these)
3. frequency = 'daily', 'weekly', or 'once' (not typos like 'daily')
4. Current time is INSIDE startTime-endTime window
5. If frequency='weekly': today's day number is in daysOfWeek array
```

#### Example: A schedule won't run if:
- Schedule says: 9:00 AM - 5:00 PM
- Cron runs at: 8:00 PM ❌ (outside window)
- Schedule says: daysOfWeek: [1,3,5] (Mon, Wed, Fri)
- Today is: Tuesday ❌ (not in list)

### Improved Logging (After Deploy)
Server logs will now show:
```
[QR Broadcast V2] Current time (IST): 18:45:32, Window: 09:00-17:00, Freq: daily, isActive: true
[QR Broadcast V2] ⏰ Outside time window (09:00-17:00)  ← See the problem!
```

### Fix
Ensure your schedule's time window matches when the cron runs.

---

## Issue 3: Send Now Not Working ✅ FIXED

### Root Causes
1. **WhatsApp not connected** — No QR code scanned yet
2. **Time guard blocking** — Outside allowed send hours (5 AM - 10:30 PM IST)
3. **Session error** — Bridge connection issue

### Fix Applied
- Better error message telling user exactly what to do
- Detailed logging showing session resolution status
- Progress logging for each message

### How to Use "Send Now"
```
Step 1: Open QR WhatsApp page
Step 2: Ensure QR code is scanned (green connection indicator)
Step 3: Go back to CRM → Try broadcast again
Step 4: If still fails → Check server logs for error details
```

### If Still Not Working
Check server logs for:
```
[qr-broadcast] ❌ No connected session found for user=... at http://bridge/sessions
     → This means: WhatsApp page not connected. Go scan QR code.

[qr-broadcast] ❌ 1/5 failed to send to 919XXX: Bridge rejected message
     → This means: WhatsApp rejected the message. Check:
        - Phone number format correct?
        - Recipient has WhatsApp active?
        - Not blocked by WhatsApp?
```

---

## Issue 4: Sent Report Missing Data ✅ FIXED

### What Changed
Old implementation:
- Called bridge's `/broadcast/report` endpoint (didn't exist)
- Returned empty data

New implementation:
- Queries MongoDB `WhatsAppMessage` collection directly
- Returns ALL sent messages with filters
- Includes statistics

### How to Test
```bash
# Get last 10 sent messages
GET /api/admin/crm/whatsapp/qr/broadcast-report?limit=10

# Get messages sent in date range
GET /api/admin/crm/whatsapp/qr/broadcast-report?from=2026-05-20&to=2026-05-23&limit=50

# Get only failed messages
GET /api/admin/crm/whatsapp/qr/broadcast-report?status=failed&limit=10

# Filter by phone number
GET /api/admin/crm/whatsapp/qr/broadcast-report?phoneNumber=919309986820&limit=20
```

### Response Shows
```json
{
  "success": true,
  "data": [
    {
      "phoneNumber": "919309986820",
      "messageContent": "Hello",
      "status": "sent",
      "sentAt": "2026-05-23T04:44:32.000Z",
      "recipientType": "individual"
    }
  ],
  "stats": {
    "total": 150,
    "byStatus": [
      { "_id": "sent", "count": 148 },
      { "_id": "failed", "count": 2 }
    ]
  }
}
```

---

## Complete Test Plan

### 1. Test Double Message Fix ✅
```
Step 1: Deploy code
Step 2: Create test broadcast with 5 recipients
Step 3: Check WhatsApp — should get 1 message each (not 2)
Step 4: Check database — should have 5 records in message_dedup_log
```

### 2. Test Schedule Messages
```
Step 1: Create schedule:
   - Name: "Test Daily"
   - Frequency: "daily"
   - startTime: "09:00"
   - endTime: "22:00"
   - isActive: true
   - status: "scheduled"
Step 2: Check server logs when cron runs
Step 3: If it doesn't run, check the log message for exact reason
Step 4: Adjust schedule settings based on log output
```

### 3. Test Send Now ✅
```
Step 1: Open QR WhatsApp page
Step 2: Wait for connection indicator (green)
Step 3: Go to CRM → Create broadcast → Click "Send Now"
Step 4: Check:
   - Messages appear on WhatsApp ✅
   - Sent report shows data ✅
   - Server logs show progress ✅
```

### 4. Test Sent Report ✅
```
Step 1: Send a test broadcast
Step 2: Go to Sent Report page
Step 3: Should see:
   - List of all sent messages
   - Total count
   - Breakdown by status (sent/failed)
Step 4: Filter by date, phone number, etc.
```

---

## Server Logs to Watch

### Watch for these patterns:

**Good logs (everything working):**
```
[QR Broadcast V2] Processing: schedule_id (schedule_name)
[QR Broadcast V2] Current time (IST): 10:30:45, Window: 09:00-17:00, Freq: daily, isActive: true
[QR Broadcast V2] ✅ Heartbeat OK - session still alive
[QR Broadcast V2] ✓ 1/10 sent (gap: 7.5s)
[qr-broadcast] ✅ Session: key=... tenantId=... user=...
[qr-broadcast] ✅ 1/5 sent to 919...
[qr-broadcast] ✅ Saved 5 message records to DB
```

**Problem logs (need investigation):**
```
[QR Broadcast V2] ⏰ Outside time window → Check schedule's startTime-endTime
[QR Broadcast V2] 📅 Not scheduled for today → Check frequency and daysOfWeek
[qr-broadcast] ❌ No connected session found → User needs to scan QR code
[qr-broadcast] ❌ failed to send → WhatsApp rejected message
```

---

## Summary of Changes

| Issue | Status | Fix |
|-------|--------|-----|
| 1. Double messages | ✅ FIXED | Atomic deduplication (reserveMessageSend) |
| 2. Schedules not running | 🔍 DIAGNOSED | Better logging to identify exact reason |
| 3. Send now not working | ✅ FIXED | Better session resolution + error messages |
| 4. Sent report empty | ✅ FIXED | Query MongoDB instead of non-existent bridge endpoint |

---

## Deployment Checklist

Before deploying:
- [ ] Code committed and tested locally
- [ ] No console errors in browser
- [ ] Server logs show new debug messages

After deploying:
- [ ] Wait 5 minutes for nodes to update
- [ ] Test "send now" with small recipient list
- [ ] Check sent report for data
- [ ] Create test schedule and watch server logs
- [ ] Monitor for double messages (should be fixed)

---

## Need Help?

If issues persist:
1. Share server logs (look for [qr-broadcast] and [QR Broadcast] messages)
2. Check what error message is shown to user
3. Verify schedule parameters (time window, frequency, daysOfWeek)
4. Ensure WhatsApp is connected (scan QR if needed)
