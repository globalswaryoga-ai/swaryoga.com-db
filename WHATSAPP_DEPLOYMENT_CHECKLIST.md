# 🚀 WhatsApp Meta API Deployment Checklist

**Status**: Ready for Production  
**Decision**: Meta API (Option A) - Selected & Implemented  
**Date**: January 7, 2026

---

## ✅ Completed Tasks

- [x] Diagnosed both WhatsApp systems (Meta + EC2)
- [x] Identified duplicate message risk
- [x] Selected Meta API as primary system
- [x] Marked EC2 Bridge as deprecated
- [x] Created comprehensive setup guide
- [x] Created test scripts
- [x] Committed all changes to main branch

---

## 🎯 Deployment Checklist

### **Phase 1: Environment Configuration** (5 minutes)

**Action**: Clear EC2 Bridge environment variables

- [ ] Access your environment settings:
  - Vercel: Project Settings → Environment Variables
  - EC2: Edit .env file / AWS Systems Manager
  - Other: Your hosting provider's config

- [ ] Clear these variables (set to empty string):
  - [ ] `WHATSAPP_WEB_BRIDGE_SECRET = ""`
  - [ ] `WHATSAPP_BRIDGE_SECRET = ""`

- [ ] Verify Meta API variables are still set:
  - [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (not empty)
  - [ ] `META_APP_SECRET` (not empty)
  - [ ] `WHATSAPP_PHONE_NUMBER_ID` (not empty)
  - [ ] `WHATSAPP_ACCESS_TOKEN` (not empty)

- [ ] Deploy/restart application

### **Phase 2: Meta Dashboard Verification** (5 minutes)

**Action**: Verify webhook configuration in Meta Business Platform

1. [ ] Go to https://business.facebook.com/
2. [ ] Select your business account
3. [ ] Navigate to: Settings → Apps and Websites → Apps
4. [ ] Select your WhatsApp app
5. [ ] Go to: Settings → Configuration
6. [ ] Verify Webhook:
   - [ ] Callback URL: `https://your-production-domain.com/api/whatsapp/webhook`
   - [ ] Verify Token: Matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - [ ] Subscribed Objects: `whatsapp_business_account`

7. [ ] Verify Webhooks Events:
   - [ ] `messages` ☑️ (REQUIRED)
   - [ ] `message_status` ☑️ (optional but recommended)
   - [ ] `message_template_status_update` ☑️ (optional)

### **Phase 3: Production Deployment** (5 minutes)

**Action**: Deploy changes to production

- [ ] Code is already committed to main branch
- [ ] Verify deployment pipeline runs (CI/CD)
- [ ] Check deployment logs for errors
- [ ] Verify application restarts successfully
- [ ] Confirm environment variables are loaded

### **Phase 4: Webhook Connectivity Test** (5 minutes)

**Action**: Verify Meta can reach your webhook

- [ ] In Meta dashboard, send a test message to your webhook
- [ ] Check application logs for incoming webhook
- [ ] Verify signature validation passes
- [ ] Verify message is processed (no errors)

**OR** (if Meta test not available)

- [ ] Send a real WhatsApp message to your business number
- [ ] Check application logs for webhook delivery
- [ ] Verify message stored in database

### **Phase 5: Real Message Testing** (10 minutes)

**Action**: Send actual WhatsApp messages and verify they appear

1. [ ] Send a simple text message from WhatsApp to your business number
2. [ ] Open `/admin/crm/whatsapp` in your CRM
3. [ ] Verify conversation appears in list
4. [ ] Verify message appears in conversation thread
5. [ ] Verify message displays on LEFT side (incoming = left bubble)
6. [ ] Verify message content is correct
7. [ ] Verify timestamp is correct

**Repeat with different message types:**
- [ ] Text message
- [ ] Image/media
- [ ] Emoji test
- [ ] Long message (100+ characters)

### **Phase 6: Monitoring & Verification** (ongoing)

- [ ] Monitor application logs for webhook errors
- [ ] Check database for message growth
- [ ] Verify no duplicate messages
- [ ] Monitor API response times
- [ ] Watch for signature validation failures

---

## 📊 Testing Scenarios

### **Scenario 1: Basic Message Flow**
```
Send: "Hello from WhatsApp"
Expected:
  ✅ Message appears in conversation list
  ✅ Message displays in thread (left bubble)
  ✅ Database has 1 message
  ✅ No duplicates
```

### **Scenario 2: Multiple Messages**
```
Send: 5 messages in sequence
Expected:
  ✅ All 5 messages appear in order
  ✅ Conversation list shows latest message
  ✅ Timestamps are correct
  ✅ No duplicates
```

### **Scenario 3: Unknown Phone Number**
```
Send: Message from new phone number
Expected:
  ✅ New lead created automatically
  ✅ Message linked to new lead
  ✅ Conversation appears in list
```

### **Scenario 4: Real-time Update**
```
Send: Message → Refresh page within 2 seconds
Expected:
  ✅ Message visible immediately (no refresh needed)
  ✅ Conversation list updated
  ✅ Unread badge appears (if implemented)
```

---

## 🚨 Troubleshooting Guide

### **Issue: "Webhook not receiving messages"**

**Check 1**: Callback URL is correct
```bash
# In Meta dashboard:
Settings → Configuration → Webhook
Verify: https://your-domain.com/api/whatsapp/webhook
```

**Check 2**: Verify token matches
```bash
# In Meta dashboard:
Verify Token should match: echo $WHATSAPP_WEBHOOK_VERIFY_TOKEN
```

**Check 3**: Application logs
```bash
# Check logs for webhook delivery
tail -f your-app-logs.log | grep -i webhook
```

**Check 4**: Firewall/Network
```bash
# Test connectivity from external IP
curl -X GET "https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TEST&hub.challenge=test123"
```

### **Issue: "Webhook receives messages but they don't show in UI"**

**Check 1**: Database connection
```bash
# Verify MongoDB is accessible
node check-whatsapp-state.js
```

**Check 2**: Message schema
```bash
# Check message structure in database
db.whatsappmessages.findOne()
```

**Check 3**: API endpoint
```bash
# Test conversations API
curl http://localhost:3000/api/admin/crm/whatsapp/meta/conversations
```

**Check 4**: Browser console
```bash
# Open DevTools → Console
F12 → Console tab → Check for errors
```

### **Issue: "Duplicate messages appearing"**

**Check 1**: Is EC2 bridge still active?
```bash
# Verify EC2 secrets are cleared
echo $WHATSAPP_WEB_BRIDGE_SECRET
echo $WHATSAPP_BRIDGE_SECRET
# Both should be empty
```

**Check 2**: Check message uniqueness
```bash
# Find duplicates by message ID
db.whatsappmessages.aggregate([
  { $group: { _id: "$id", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

---

## ✨ Success Criteria

Your deployment is successful when:

- ✅ WhatsApp messages are received by your webhook
- ✅ Messages are stored in MongoDB
- ✅ Messages appear in conversation list immediately
- ✅ Messages display in chat thread with correct direction
- ✅ No duplicate messages are created
- ✅ Phone numbers are normalized correctly
- ✅ New leads are auto-created for unknown numbers
- ✅ Real-time updates work (no manual refresh needed)
- ✅ No errors in application logs
- ✅ All API endpoints respond correctly

---

## 📞 Support & Next Steps

### **If Everything Works** ✅
- Monitor the system for 24 hours
- Verify stable performance
- Document any custom configurations
- Add automated monitoring/alerting

### **If Issues Found** ❌
- Check troubleshooting guide above
- Review application logs
- Verify environment variables
- Test with curl to isolate issue
- Check Meta dashboard for webhook delivery status

### **For Scale Testing** 📈
- Test with 100+ conversations
- Monitor database performance
- Check API response times
- Verify real-time sync latency
- Load test webhook endpoint

---

## 📝 Documentation References

- **META_API_SETUP_GUIDE.md** - Complete setup instructions
- **WHATSAPP_DUAL_SYSTEM_ANALYSIS.md** - System comparison
- **WHATSAPP_CRITICAL_DECISION.md** - Decision framework

## 🔍 Test Scripts Available

```bash
# Check environment variables
node check-env-vars.js

# Check database state
node check-whatsapp-state.js

# Generate test webhook payload
node test-meta-webhook.js

# Send test webhook locally
node test-meta-integration.js
```

---

## ⏱️ Timeline Summary

| Step | Time | Status |
|------|------|--------|
| 1. Environment config | 5 min | ⏳ To Do |
| 2. Meta dashboard verification | 5 min | ⏳ To Do |
| 3. Production deployment | 5 min | ⏳ To Do |
| 4. Webhook connectivity test | 5 min | ⏳ To Do |
| 5. Real message testing | 10 min | ⏳ To Do |
| **Total** | **30 min** | ⏳ Ready |

---

## ✅ Deployment Sign-Off

- [x] Code review: Passed
- [x] Documentation: Complete
- [x] Testing plan: Documented
- [x] Rollback plan: Available
- [ ] Environment variables: Updated (awaiting your action)
- [ ] Meta dashboard: Verified (awaiting your verification)
- [ ] Production deployment: Complete (awaiting your deployment)
- [ ] Real message test: Passed (awaiting your testing)

**Ready to deploy! Start with Phase 1 above.** 🚀
