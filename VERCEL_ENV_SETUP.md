# 🌐 Production Deployment - Vercel Environment Variables

## ⚠️ ISSUE
You're accessing the QR page at production domain but it's not working because **environment variables are missing from Vercel**.

## ✅ SOLUTION - Add These 4 Variables

### Step 1: Go to Vercel Dashboard
**URL:** https://vercel.com/swar-yoga-projects/swaryoga-com-db/settings/environment-variables

### Step 2: Click "Add" Button and Add Each Variable:

---

#### **Variable 1: NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL**
```
Name:  NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL
Value: http://3.109.154.61:3333
Environments: ☑ Production ☑ Preview ☑ Development
```

#### **Variable 2: NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET**
```
Name:  NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET
Value: swar-bridge-secret-2024
Environments: ☑ Production ☑ Preview ☑ Development
```

#### **Variable 3: WHATSAPP_BRIDGE_HTTP_URL**
```
Name:  WHATSAPP_BRIDGE_HTTP_URL
Value: http://3.109.154.61:3333
Environments: ☑ Production ☑ Preview ☑ Development
```

#### **Variable 4: WHATSAPP_BRIDGE_SECRET**
```
Name:  WHATSAPP_BRIDGE_SECRET
Value: swar-bridge-secret-2024
Environments: ☑ Production ☑ Preview ☑ Development
```

---

### Step 3: Redeploy
1. Click the **"Redeploy"** button on Vercel dashboard
2. OR go to **Deployments** tab and click **"Redeploy"** on the latest deployment
3. Wait 5-10 minutes for deployment to complete

### Step 4: Test
1. Visit: **https://domain-crm.swaryoga.com/admin/crm/qr**
2. The QR modal should **automatically open** 🎉
3. Scan with WhatsApp on your phone

---

## 🔍 Verify Bridge is Running on EC2

Before testing, make sure the bridge is running on the EC2 server:

```bash
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://3.109.154.61:3333/status
```

Expected response:
```json
{"status":"disconnected","hasQr":true}
```

---

## 🐛 If QR Still Doesn't Appear

1. **Check Environment Variables in Vercel:**
   - Go to Settings → Environment Variables
   - Verify all 4 variables are set correctly
   
2. **Hard Refresh Browser:**
   - Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows/Linux)
   
3. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for errors starting with `[checkStatus]`, `[refreshQr]`, or `[handleConnect]`
   
4. **Verify EC2 Bridge:**
   - SSH to EC2: `ssh -i your-key.pem ec2-user@3.109.154.61`
   - Check: `ps aux | grep whatsapp`
   - If not running: `cd services/whatsapp-web && node index.js`

---

## ✅ Checklist Before Production

- [ ] Code pushed to GitHub (commit 9ad7863) ✅
- [ ] Environment variables added to Vercel (all 4)
- [ ] Vercel redeployed
- [ ] EC2 bridge is running
- [ ] Bridge responds to status endpoint
- [ ] Production domain QR page displays modal

---

**Status:** 🚀 Ready for deployment once variables are added!
