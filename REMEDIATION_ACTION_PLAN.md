# 🔧 Unsafe Environments - Remediation Action Plan

**Priority**: 🔴 URGENT  
**Timeline**: Complete within 24 hours  

---

## Phase 1: Immediate Damage Control (0-1 hour)

### ✅ Task 1.1: Revoke MongoDB Credentials
**Location**: MongoDB Atlas Console  
**Steps**:
1. Go to https://cloud.mongodb.com
2. Select your cluster: `swaryogadb`
3. Navigate: Database Access → Users
4. Find user: `swarsakshi9_db_user`
5. **Click Delete** (⚠️ This will break the app temporarily)
6. **Create new user** with same name + strong password
7. Copy the new connection string
8. Update `.env.local` with new `MONGODB_URI_MAIN`

**Expected Password Format**:
```
mongodb+srv://swarsakshi9_db_user:YOUR_NEW_SECURE_PASSWORD@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority
```

---

### ✅ Task 1.2: Regenerate Meta Credentials
**Location**: Meta Business Manager → App  
**Steps**:

#### A. Regenerate App Secret
1. Go to https://developers.facebook.com/apps
2. Select your WhatsApp app
3. Navigate: Settings → Basic
4. **Click "Show"** next to App Secret (old one: `ce4bf92f6be0c7bace755a216cbf1ef2`)
5. **Cannot rotate App Secret** - Must recreate the app OR contact Meta support
6. For now, **document current exposure** and plan app recreation

#### B. Regenerate Access Token
1. Go to your Business Account
2. Navigate: Users → System Users
3. Find the system user with WhatsApp access token
4. **Generate new token**
5. Copy new token (starts with `EAAZA...`)
6. Update `.env.local`: `WHATSAPP_ACCESS_TOKEN=`

---

### ✅ Task 1.3: Generate New Webhook Verify Token
**No dashboard regeneration needed** - Create locally:

```bash
# Generate new 32-byte hex token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
```

**Update**:
1. Copy the generated token
2. Update `.env.local`: `WHATSAPP_WEBHOOK_VERIFY_TOKEN=`
3. **Also update in Meta Business Manager** → Webhook Settings

---

## Phase 2: Remove Secrets from Git (1-3 hours)

### ✅ Task 2.1: Delete `.env.production` from Git History

**Option A: Using `git filter-branch` (Safest)**
```bash
cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db

# Remove .env.production from all commits
git filter-branch --tree-filter 'rm -f .env.production' -- --all

# Clean up git history
git reflog expire --expire=now --all
git gc --aggressive --prune=now

# Force push to remote (⚠️ This rewrites history!)
git push --force-with-lease origin main
```

**Option B: Using BFG Repo-Cleaner (Faster)**
```bash
# Install BFG
brew install bfg

# Remove .env.production from history
bfg --delete-files .env.production

# Clean up
git reflog expire --expire=now --all
git gc --aggressive --prune=now

# Force push
git push --force-with-lease origin main
```

---

### ✅ Task 2.2: Remove Secrets from Scripts

**Files to Clean**:

1. **`deep-repair.js`** (Line 4)
   - Replace: `const uri = "mongodb+srv://..."` 
   - With: `const uri = process.env.MONGODB_URI_MAIN || throw new Error('...')`

2. **`diagnose-webhook-issue.sh`** (Line 67)
   - Replace hardcoded MongoDB URI
   - With: `mongoose.connect(process.env.MONGODB_URI_MAIN)`

3. **`test-webhook-flow.sh`** (Line 36)
   - Replace hardcoded MongoDB URI
   - With: Source from `.env.local`

**Command to find all files with secrets**:
```bash
grep -r "hZnGhuVUNoew0Gje" . --include="*.js" --include="*.sh" --include="*.ts"
grep -r "ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d" . --include="*.js" --include="*.sh"
```

---

## Phase 3: Update Codebase (3-6 hours)

### ✅ Task 3.1: Replace Hardcoded Bridge Secret Defaults

**Pattern to Change** (40+ files):
```javascript
// ❌ BEFORE
const BRIDGE_SECRET = process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024';

// ✅ AFTER  
const BRIDGE_SECRET = process.env.WHATSAPP_WEB_BRIDGE_SECRET || (() => {
  throw new Error('WHATSAPP_WEB_BRIDGE_SECRET must be set in .env.local for production');
})();
```

**Or safer:**
```javascript
const BRIDGE_SECRET = process.env.WHATSAPP_WEB_BRIDGE_SECRET;
if (!BRIDGE_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('WHATSAPP_WEB_BRIDGE_SECRET required in production');
}
```

**Files to Update** (use find & replace):
- `services/whatsapp-web/index.js` (line 56)
- `services/whatsapp-web/ecosystem.config.cjs` (line 33)
- `app/api/admin/crm/whatsapp/*.ts` (multiple files)
- `setup-wa-bridge-macos.sh`
- `setup-ec2-from-mac.sh`
- All other scripts

---

### ✅ Task 3.2: Update `.gitignore`

**Add these lines**:
```bash
# Environment variables (never commit these)
.env
.env.local
.env.local.*
.env.production
.env.staging
.env.development.local
.env.test.local
.env.*.local

# Backup files
.env.*~
.env*.bak
```

---

### ✅ Task 3.3: Create Safe Documentation

**Create `.env.setup.md`**:
```markdown
# Environment Setup Guide

## Development (.env.local)

1. Copy template:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

2. Get real values:
   - MongoDB URI from [Atlas](https://cloud.mongodb.com)
   - Access Token from [Meta Business Manager](https://business.facebook.com)
   - Webhook Verify Token from your Meta app settings

3. Fill in `.env.local`:
   \`\`\`
   MONGODB_URI_MAIN=mongodb+srv://YOUR_USER:YOUR_PASS@...
   WHATSAPP_ACCESS_TOKEN=EAAZA...
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=<your-token>
   META_APP_SECRET=<your-secret>
   \`\`\`

4. Test:
   \`\`\`bash
   npm run dev
   \`\`\`

## Production (Vercel)

Set these in Vercel Dashboard → Settings → Environment Variables:
- MONGODB_URI_MAIN
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_WEBHOOK_VERIFY_TOKEN
- META_APP_SECRET
- WHATSAPP_WEB_BRIDGE_SECRET (generate new: `crypto.randomBytes(16).toString('hex')`)

⚠️ **Never** commit these values to git.
```

---

## Phase 4: Verification (30 minutes)

### ✅ Task 4.1: Verify Secrets Removed from Git

```bash
# Check if secrets are still in history
git log -p | grep -i "mongodb+srv" | head -1
git log -p | grep -i "EAAZA" | head -1
git log -p | grep -i "ce353ae" | head -1

# Should return: (no matches)
```

---

### ✅ Task 4.2: Verify App Still Works

```bash
# Start app
npm run dev

# Test MongoDB connection
curl http://localhost:3000/api/health

# Should return: { status: 'ok' }
```

---

### ✅ Task 4.3: Run Security Scanner

```bash
# Install git-secrets
brew install git-secrets

# Scan entire history
git secrets --scan-history
git secrets --scan

# Should return: (no matches)
```

---

## Phase 5: Team Communication (10 minutes)

### ✅ Task 5.1: Notify Team

**Email Template**:

```
Subject: 🚨 URGENT - Credentials Compromised - Action Required

Team,

Hardcoded secrets were found in our GitHub repository:
- MongoDB username & password
- Meta Access Token
- Meta App Secret  
- Webhook Verify Tokens

ALL THESE CREDENTIALS HAVE BEEN REVOKED.

✅ New credentials are being generated and will be shared securely.
✅ Secrets have been removed from git history.
✅ `.env.local` is now required for local development.

No user data was compromised. Database access is protected.

Action Items:
1. Pull latest changes: git pull origin main
2. Create .env.local from .env.example
3. Request new credentials from [LEAD]
4. Run: npm run dev (should work without errors)

Questions? Slack me.

- [Your Name]
```

---

## ⏱️ Timeline Summary

| Phase | Tasks | Est. Time | Owner |
|-------|-------|-----------|-------|
| 1 | Revoke credentials | 30 min | You |
| 2 | Remove from git | 1.5 hrs | You |
| 3 | Update codebase | 2-3 hrs | Developer |
| 4 | Verify | 30 min | Developer + You |
| 5 | Notify team | 10 min | You |
| **Total** | **All** | **4-5 hrs** | **Team** |

---

## 📋 Pre-Flight Checklist

Before you start, confirm:
- [ ] You have access to MongoDB Atlas
- [ ] You have access to Meta Business Manager
- [ ] You can force-push to main (discussed with team)
- [ ] `.env.local` is already in `.gitignore`
- [ ] You have the backup of current `.env.production` stored securely offline

---

## 🆘 If Something Goes Wrong

### Git History Push Fails
```bash
# If force-push is rejected:
git push origin main --force-with-lease --no-verify
```

### App Won't Start After Changes
```bash
# Check if new MongoDB URI works:
node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI_MAIN, console.log)"

# Check if all env vars are set:
env | grep MONGODB
env | grep WHATSAPP
```

### Need to Restore Committed Secrets from .env.production
```bash
# DON'T do this - it defeats the purpose!
# Instead, ask team for new shared credentials in 1Password/LastPass
```

---

## ✅ Post-Remediation

After completing all phases:

1. **Schedule a security review** with the team
2. **Add GitHub secret scanning** (automatic)
3. **Implement pre-commit hooks** to catch secrets
4. **Document secrets rotation process** (quarterly)
5. **Update onboarding guide** with `.env.local` setup

---

**Need help? Check the main security report: `UNSAFE_ENVIRONMENTS_REPORT.md`**
