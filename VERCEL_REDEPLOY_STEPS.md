# 🚀 VERCEL REDEPLOY - Step by Step

## Before You Redeploy - IMPORTANT CHECK

You MUST add the environment variables to Vercel FIRST, otherwise the redeploy won't help.

---

## Step 1: Go to Vercel Dashboard
**URL**: https://vercel.com/dashboard

---

## Step 2: Select Your Project
Click on: **swar-yoga-web-mohan** (or your active project)

---

## Step 3: Go to Settings
Click the **Settings** tab at the top

---

## Step 4: Environment Variables
Click **Environment Variables** in left sidebar

---

## Step 5: CHECK - Are These Variables Already There?

Look for:
- ✅ `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL`
- ✅ `WHATSAPP_BRIDGE_HTTP_URL`

### If YES - Skip to Step 7 (Redeploy)
### If NO - Continue to Step 6 (Add Variables)

---

## Step 6: Add Missing Variables

**Variable 1:**
- Name: `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL`
- Value: `https://swar-yoga-bridge.ngrok.io`
- Environments: ✅ Production ✅ Preview ✅ Development
- Click **Save**

**Variable 2:**
- Name: `WHATSAPP_BRIDGE_HTTP_URL`
- Value: `https://swar-yoga-bridge.ngrok.io`
- Environments: ✅ Production ✅ Preview ✅ Development
- Click **Save**

---

## Step 7: Redeploy

Go to **Deployments** tab

Find the latest deployment (should show "Ready Stale")

Click the **"..."** (three dots) menu on the right

Select **"Redeploy"**

---

## Step 8: Wait for Build

Status will show:
- 🟡 **Building** (1-3 minutes)
- 🟢 **Ready** (deployment complete)

---

## Step 9: Test

Once you see **"Ready"** status:

Open: **https://crm.swaryoga.com/admin/crm/qr**

Click **"Login (QR)"**

**QR code should appear!** 📱 ✅

---

## Troubleshooting

**If it still doesn't work:**
1. Clear browser cache: `Cmd+Shift+R` (Mac)
2. Wait 5 minutes for CDN to update
3. Check if ngrok tunnel is still running
4. Verify environment variables were saved in Vercel

---

**Ready to start?** 🚀

Tell me when you're done with each step!
