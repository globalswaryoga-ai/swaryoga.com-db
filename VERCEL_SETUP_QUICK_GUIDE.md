# ✅ VERCEL SETUP - Quick Instructions

## What You Need to Do

Add these 2 environment variables to your Vercel project:

### Variable 1
```
Name: NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL
Value: https://swar-yoga-bridge.ngrok.io
```

### Variable 2
```
Name: WHATSAPP_BRIDGE_HTTP_URL
Value: https://swar-yoga-bridge.ngrok.io
```

---

## Step-by-Step

### 1. Open Vercel Dashboard
Go to: https://vercel.com/dashboard

### 2. Select Project
Click on: **swar-yoga-web-mohan** (or your project name)

### 3. Go to Settings
Click the **Settings** tab at the top

### 4. Find Environment Variables
Click **Environment Variables** in the left sidebar

### 5. Add First Variable
- Click **"Add New"** button
- Fill in:
  - **Name**: `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL`
  - **Value**: `https://swar-yoga-bridge.ngrok.io`
  - **Select Environments**: 
    - ✅ Production
    - ✅ Preview
    - ✅ Development (optional)
- Click **"Save"** button

### 6. Add Second Variable
- Click **"Add New"** button again
- Fill in:
  - **Name**: `WHATSAPP_BRIDGE_HTTP_URL`
  - **Value**: `https://swar-yoga-bridge.ngrok.io`
  - **Select Environments**: 
    - ✅ Production
    - ✅ Preview
    - ✅ Development (optional)
- Click **"Save"** button

### 7. Redeploy Your Project
Option A (Easy):
- Go to **Deployments** tab
- Find the latest deployment
- Click the **"..."** menu
- Click **"Redeploy"**

Option B (Via Git):
- Push any commit to your main branch
- Vercel will auto-redeploy

### 8. Wait for Deployment
- You'll see "Building..." status
- Wait for "Ready" status (usually 2-3 minutes)

### 9. Test on Production Domain
- Open: https://crm.swaryoga.com/admin/crm/qr
- Click **"Login (QR)"** button
- **QR code should appear!** ✅

---

## Verification

After deployment, you can verify the environment variables were applied:

1. Go to Vercel project **Settings**
2. Click **Environment Variables**
3. You should see both variables listed
4. Status should show ✅ (checkmark)

---

## 🎉 All Done!

Once redeployed, your production domain will use the ngrok bridge tunnel and the QR code will work on `crm.swaryoga.com`

**Need help with any step?** Let me know!
