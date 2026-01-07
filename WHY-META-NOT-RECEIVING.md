#!/usr/bin/env node

/**
 * DIAGNOSTIC: Why Meta messages are not being received
 * 
 * ISSUE FOUND:
 * Your webhook endpoint requires WHATSAPP_WEBHOOK_VERIFY_TOKEN
 * but it's NOT set in your environment variables.
 * 
 * When Meta tries to send messages to your webhook, the request is REJECTED.
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     WHY META MESSAGES ARE NOT BEING RECEIVED                   ║
╚════════════════════════════════════════════════════════════════╝

🔴 PROBLEM:
   Your webhook endpoint is rejecting Meta's incoming messages

📋 ROOT CAUSE:
   Missing environment variable:
   → WHATSAPP_WEBHOOK_VERIFY_TOKEN

⚙️  HOW IT WORKS:
   1. Meta sends message to: https://yourdomain.com/api/whatsapp/webhook
   2. Your webhook checks for WHATSAPP_WEBHOOK_VERIFY_TOKEN
   3. If token is missing → Request is REJECTED
   4. Message is lost, customer doesn't get response

📍 WEBHOOK LOCATION:
   File: app/api/whatsapp/webhook/route.ts
   Line: ~45 (checking expectedToken)

🔧 WHAT YOU NEED TO DO:

1️⃣  GET YOUR VERIFY TOKEN FROM META:
   - Go to Meta Business Manager
   - Find WhatsApp Business Account settings
   - Look for "Webhooks" or "API Integration"
   - Find the "Verify Token" field
   
   OR generate a random secure token:
   openssl rand -hex 32
   
   Example: abc123def456ghi789jkl012mno345pqr

2️⃣  SET IT IN VERCEL:
   vercel env add WHATSAPP_WEBHOOK_VERIFY_TOKEN production
   (Paste your token value)

3️⃣  VERIFY IN META DASHBOARD:
   - Go to Meta Apps > WhatsApp > Configuration
   - Set Callback URL: https://swar-yoga-web-mohan-gvf9cnmax-swar-yoga-projects.vercel.app/api/whatsapp/webhook
   - Set Verify Token: (same token from step 1)

4️⃣  REDEPLOY:
   git push
   vercel deploy --prod

5️⃣  TEST:
   Meta will send a verification request
   → Your webhook will respond with 200 OK
   → Incoming messages will work!

════════════════════════════════════════════════════════════════

🎯 SUMMARY:
   Without WHATSAPP_WEBHOOK_VERIFY_TOKEN → No incoming messages
   With WHATSAPP_WEBHOOK_VERIFY_TOKEN → Messages flow through

START HERE: Get your verify token from Meta, then set it in Vercel.

════════════════════════════════════════════════════════════════
`);
