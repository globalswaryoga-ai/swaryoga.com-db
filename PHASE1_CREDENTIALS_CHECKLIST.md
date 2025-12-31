# 🎯 DEPLOYMENT QUICK START — PHASE 1: CREDENTIALS

**Current Phase:** 1 of 7  
**Time Elapsed:** 0 min  
**Time Remaining:** ~2-3 hours  
**Status:** 🔴 STARTING NOW

---

## 📋 PHASE 1: Gather Credentials (30 min)

You have **5 platforms** to configure. Each takes 5-10 minutes.

### Credential Gathering Order (Do them in this order):

#### 🔵 TASK 1.1: Facebook (10 min)
**📖 Reference:** `CREDENTIAL_GATHERING_WORKSHEET.md` — Section 1  
**Link:** https://developers.facebook.com/apps

- [ ] Create/Select Facebook App
- [ ] Get `FACEBOOK_APP_ID`
- [ ] Get `FACEBOOK_APP_SECRET`
- [ ] Get `FACEBOOK_PAGE_ACCESS_TOKEN`
- [ ] Paste below:

```
FACEBOOK_APP_ID = 
FACEBOOK_APP_SECRET = 
FACEBOOK_PAGE_ACCESS_TOKEN = 
```

---

#### 🔵 TASK 1.2: YouTube (10 min)
**📖 Reference:** `CREDENTIAL_GATHERING_WORKSHEET.md` — Section 2  
**Link:** https://console.cloud.google.com/

- [ ] Create Google Cloud Project
- [ ] Enable YouTube Data API v3
- [ ] Get `YOUTUBE_API_KEY`
- [ ] Get `YOUTUBE_CHANNEL_ID`
- [ ] Paste below:

```
YOUTUBE_API_KEY = 
YOUTUBE_CHANNEL_ID = 
```

---

#### 🔵 TASK 1.3: X/Twitter (5 min)
**📖 Reference:** `CREDENTIAL_GATHERING_WORKSHEET.md` — Section 3  
**Link:** https://developer.twitter.com/

- [ ] Create/Select App
- [ ] Generate `TWITTER_BEARER_TOKEN`
- [ ] Verify it starts with `AAAA`
- [ ] Paste below:

```
TWITTER_BEARER_TOKEN = 
```

---

#### 🔵 TASK 1.4: LinkedIn (5 min)
**📖 Reference:** `CREDENTIAL_GATHERING_WORKSHEET.md` — Section 4  
**Link:** https://www.linkedin.com/developers/apps

- [ ] Create App
- [ ] Generate `LINKEDIN_ACCESS_TOKEN`
- [ ] Get `LINKEDIN_COMPANY_ID`
- [ ] Paste below:

```
LINKEDIN_ACCESS_TOKEN = 
LINKEDIN_COMPANY_ID = 
```

---

#### 🔵 TASK 1.5: CRON_SECRET (1 min)
**📖 Reference:** `CREDENTIAL_GATHERING_WORKSHEET.md` — Section 5  

- [ ] Generate random secret key
- [ ] Paste below:

```
CRON_SECRET = 
```

---

## ⏭️ NEXT: Phase 2 — Set Environment Variables

Once you have **all 8 credentials above**, proceed to **Phase 2**:

**→ Open `DEPLOYMENT_CHECKLIST.md` → Phase 2: Environment Setup**

You'll add these to your production environment:
- Vercel Dashboard → Settings → Environment Variables
- AWS → Secrets Manager
- Your hosting platform's env var settings

---

## 🆘 Need Help?

| Question | Answer |
|----------|--------|
| Where do I paste credentials? | Temporary: In `CREDENTIAL_GATHERING_WORKSHEET.md` to stay organized. Then in Phase 2, add to production `.env.production` or hosting platform |
| Is this secure? | ✅ Yes, if you don't commit the worksheet. Delete it after Phase 2 |
| What if I can't get a credential? | Check the troubleshooting section in `CREDENTIAL_GATHERING_WORKSHEET.md` |
| Can I do them out of order? | ✅ Yes, but do all 5 before moving to Phase 2 |
| What's CRON_SECRET for? | Prevents random people from triggering your scheduler endpoint |

---

## 🚀 Let's Start!

**Pick your first task above and follow the instructions in `CREDENTIAL_GATHERING_WORKSHEET.md`**

Once done with all 5, come back here and proceed to Phase 2!

🎯 **Time to start:** RIGHT NOW  
⏱️ **Estimated duration:** 30 minutes  
✅ **Next milestone:** All 8 credentials gathered
