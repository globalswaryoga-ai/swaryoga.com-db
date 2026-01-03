# WhatsApp Meta Webhook Configuration - Complete Guide

## ✅ What We've Verified
- Webhook endpoint: **https://crm.swaryoga.com/api/whatsapp/webhook** ✅ **Working (HTTP 200)**
- Verify Token: `swaryoga_mata_web_app` ✅ **Set in Vercel**
- Access Token: ✅ **Set in Vercel**
- Phone Number ID: ✅ **Set in Vercel**

---

## 🚀 Steps to Configure Meta Webhook

### **Step 1: Go to Meta App Dashboard**
1. Visit: https://developers.facebook.com/
2. Select your **WhatsApp Business Platform app**
3. In left sidebar, click: **WhatsApp** → **Configuration**

### **Step 2: Configure Webhook**
In the **Webhook** section, click **"Edit"**:

#### **Callback URL Field:**
```
https://crm.swaryoga.com/api/whatsapp/webhook
```

#### **Verify Token Field:**
```
swaryoga_mata_web_app
```

⚠️ **IMPORTANT:**
- Copy-paste exactly (no extra spaces before/after)
- Verify Token is case-sensitive
- Don't include quotes or backticks

### **Step 3: Subscribe to Webhook Events**
Check these boxes:
- ✅ `messages` (receive inbound customer messages)
- ✅ `message_status` (track delivery/read status)

### **Step 4: Save and Meta Will Auto-Verify**
Click: **"Verify and Save"** or **"Save"**

Meta will automatically send a GET request to:
```
https://crm.swaryoga.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=swaryoga_mata_web_app&hub.challenge=<random-string>
```

Our endpoint will respond with HTTP 200 and the challenge string. ✅

---

## 🔧 Troubleshooting If Verification Fails

### **Option A: Test the Endpoint First**
Open a new terminal and run:
```bash
curl -v "https://crm.swaryoga.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=swaryoga_mata_web_app&hub.challenge=test123"
```

You should see:
```
< HTTP/2 200
...
test123
```

### **Option B: Check Spelling**
- **Token:** `swaryoga_mata_web_app` (exactly)
- **URL:** `https://crm.swaryoga.com/api/whatsapp/webhook` (exactly)

### **Option C: Try Again**
- If it fails with "couldn't be validated", wait 30 seconds and try clicking "Verify and Save" again
- Meta might have momentary connectivity issues

### **Option D: Check Your App is the Right One**
Make sure:
- ✅ You're in the **WhatsApp Business Platform app** (not Facebook, Instagram, or another app)
- ✅ You're in **Production environment** (if there's an option)
- ✅ The Phone Number ID in Meta matches: `733788303156745`

---

## 📊 After Successful Verification

Once Meta shows ✅ **"Webhook verified"**:

1. **Start Receiving Messages:**
   - When a customer sends a message to your WhatsApp number
   - Meta sends POST to `https://crm.swaryoga.com/api/whatsapp/webhook`
   - Messages appear in CRM dashboard

2. **Message Status Updates:**
   - Meta tracks: sent → delivered → read → failed
   - Status updates sent to same webhook endpoint
   - CRM dashboard shows message status

3. **Message Sending:**
   - CRM admin can send messages via: `https://crm.swaryoga.com/admin/crm/whatsapp`
   - Uses Meta API as primary (fastest)
   - Falls back to Web Bridge if Meta fails

---

## 🎯 Final Checklist

- [ ] Went to https://developers.facebook.com/ 
- [ ] Selected the right WhatsApp app
- [ ] Clicked WhatsApp → Configuration
- [ ] Entered Callback URL: `https://crm.swaryoga.com/api/whatsapp/webhook`
- [ ] Entered Verify Token: `swaryoga_mata_web_app`
- [ ] Selected both `messages` and `message_status` checkboxes
- [ ] Clicked "Verify and Save"
- [ ] Saw ✅ confirmation that webhook was verified
- [ ] Started seeing messages in CRM (may take a few minutes)

---

## 📞 Need Help?

If verification still fails after trying all options above, you can test manually by visiting this URL in your browser:

```
https://crm.swaryoga.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=swaryoga_mata_web_app&hub.challenge=testing123
```

**Expected response in browser:** `testing123`  
**If you see this:** The endpoint works, any validation error is on Meta's side (try again in a few minutes)

---

## 🔐 Security Note
The verify token `swaryoga_mata_web_app` acts as a password between Meta and your webhook. It's already configured in Vercel and won't be exposed.
