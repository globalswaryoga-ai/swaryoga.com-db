#!/usr/bin/env node

/**
 * DIAGNOSTIC: Why Meta is not sending messages to your webhook
 * 
 * This checks if Meta is actually configured to send webhooks
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║      WHY META IS NOT SENDING INCOMING MESSAGES                 ║
╚════════════════════════════════════════════════════════════════╝

🔴 SITUATION:
   Your webhook URL is correct: https://crm.swaryoga.com/api/whatsapp/webhook
   Your verify token is correct: ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d
   BUT: No real messages are arriving from customers

🔍 DIAGNOSIS:
   Meta is NOT calling your webhook. This means webhook subscription is NOT active.

════════════════════════════════════════════════════════════════

✅ STEP 1: Go to Meta App Dashboard
   https://developers.facebook.com/

✅ STEP 2: Select Your WhatsApp Business App
   - Click on your app
   - Go to "Configuration" or "Webhooks"

✅ STEP 3: Find "Webhooks" Section
   Look for a section that says:
   - "Webhooks"
   - "Callback URL"
   - OR "Subscribe" button

✅ STEP 4: Check Current Configuration
   You should see:
   ┌─────────────────────────────────────────┐
   │ Callback URL (Webhook URL):             │
   │ https://crm.swaryoga.com/api/whatsapp/webhook│
   │                                         │
   │ Verify Token:                           │
   │ ce353ae0e9367a387963a60657848f20a...  │
   │                                         │
   │ Webhook Fields (Subscribe to):          │
   │ ✓ messages                              │
   │ ✓ message_status                        │
   │ (other fields optional)                 │
   └─────────────────────────────────────────┘

✅ STEP 5: If Not Configured
   - Click "Edit" or "Configure"
   - Paste Callback URL: https://crm.swaryoga.com/api/whatsapp/webhook
   - Paste Verify Token: ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d
   - Click "Verify and Save" or "Confirm"

✅ STEP 6: Subscribe to Message Events
   - Find the "Webhook Fields" or "Subscribe to" section
   - Make sure these are CHECKED:
     ✓ messages
     ✓ message_status
   - Click "Save" or "Subscribe"

✅ STEP 7: Wait for Confirmation
   Meta will:
   1. Send a GET request to your webhook with hub.challenge
   2. Your system should respond with the challenge value
   3. Meta will show "✓ Webhook verified" or green checkmark

✅ STEP 8: Send Test Message
   - Use a real WhatsApp number to send a message to your business account
   - Message should appear in your CRM within 5 seconds
   - Run this command: node check-incoming-meta-messages.js

════════════════════════════════════════════════════════════════

⚠️ COMMON ISSUES:

Issue: "Webhook verification failed"
→ Solution: Check your verify token matches exactly (no spaces, no newlines)

Issue: "Webhook not responding"
→ Solution: Check your domain DNS is working: curl https://crm.swaryoga.com

Issue: "Webhook configured but no messages arriving"
→ Solution: Make sure "messages" field is checked in webhook subscriptions

Issue: "Only getting delivery confirmations, not messages"
→ Solution: Check that "message_status" is separate from "messages" field

════════════════════════════════════════════════════════════════

📝 YOUR WEBHOOK DETAILS (share with Meta support if needed):

Callback URL: https://crm.swaryoga.com/api/whatsapp/webhook
Verify Token: ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d
App ID: (find in Meta app settings)
WhatsApp Business Account ID: (find in Meta Business Manager)

════════════════════════════════════════════════════════════════

🎯 ACTION REQUIRED:

Go to Meta Dashboard NOW and:
1. Check if webhook is subscribed
2. Verify the URL and token match
3. Make sure "messages" field is enabled
4. Click "Verify and Save"

Then send yourself a test message and run:
  node check-incoming-meta-messages.js

Let me know what you see!

════════════════════════════════════════════════════════════════
`);
