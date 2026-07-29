# QR WhatsApp Backup System - Deployment & Testing Guide

## 🚀 What's Been Deployed

Complete WhatsApp backup system with:
- ✅ Email/Password authentication
- ✅ Google Drive OAuth integration
- ✅ Google Contacts sync
- ✅ Backup status tracking
- ✅ Retention policies (1-3 years)
- ✅ Interactive setup guides

---

## 🔧 Admin Setup (Required Before Users Can Use)

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Swar Yoga WhatsApp Backup"
3. Enable these APIs:
   - **Google Drive API**
   - **Google People API** (for contacts)
4. Create OAuth 2.0 Web Application credential
5. Set redirect URI: `https://swaryoga.com/api/admin/crm/qr/auth/google-connect/callback`
   (or `http://localhost:3000/...` for local testing)
6. Download credentials

### Step 2: Add to Environment

Add to `.env.production` (or `.env.local` for testing):

```bash
GOOGLE_CLIENT_ID=your_client_id_from_google
GOOGLE_CLIENT_SECRET=your_client_secret_from_google
NEXT_PUBLIC_APP_URL=https://swaryoga.com
```

### Step 3: Restart Application
- Production: Redeploy the app
- Local: Restart dev server

---

## 👤 User Setup (Simple 3-Step Guide)

Users see an interactive guide when they click "Connect Google Drive":

### Step 1: Create Account
- Email: Any email address (for login)
- Password: Create password
- Creates backup account

### Step 2: Enable Google APIs
- Guide shows exactly what to enable
- Click-to-copy buttons for easy setup

### Step 3: Create OAuth Credentials
- Guide shows which credentials to create
- Auto-detects correct redirect URI
- Provides copy-paste template

---

## 🎯 Features Available to Users

### In QR WhatsApp Settings Tab:

#### Chat Backup Section
- ✅ Shows backup status (Connected/Not Connected)
- ✅ Shows last backup time
- ✅ Shows total backups count
- ✅ Shows retention period (1-3 years)
- ✅ Manual "Backup Now" button
- ✅ Displays backup history (last 5)
- ✅ Click "Connect Google Drive" to setup

#### Google Contacts Sync Section
- ✅ Shows synced contacts count
- ✅ Shows last sync time
- ✅ "Sync Google Contacts Now" button
- ✅ One-click sync from Google Contacts

---

## 📊 What Gets Backed Up

### Automatic Backups (when user clicks "Backup Now")
- All WhatsApp chats
- All messages (with message count tracking)
- All contacts (with contact count tracking)

### Storage Location
```
User's Google Drive:
  /Swar Yoga Backup/
    WhatsApp/
      [UserPhoneNumber]/
        chats.json
        contacts.json
        messages.json
```

### Retention Policy
- Default: 730 days (2 years)
- Configurable: 365-1095 days (1-3 years per user)
- Auto-cleanup of old backups

---

## 💾 Database Collections

### `qr_user_accounts`
Stores user credentials and settings:
```json
{
  "email": "user@example.com",
  "passwordHash": "bcrypt_encrypted",
  "googleDriveConnected": true,
  "googleAccessToken": "access_token",
  "googleRefreshToken": "refresh_token",
  "googleTokenExpiry": "2026-08-29T00:00:00Z",
  "retentionDays": 730,
  "backupEnabled": true
}
```

### `qr_backup_logs`
Tracks all backup operations:
```json
{
  "userId": "user_id",
  "action": "backup_created",
  "status": "completed",
  "itemsCount": {
    "chats": 45,
    "messages": 2341,
    "contacts": 120
  },
  "storageUsedMB": 12.5,
  "createdAt": "2026-07-29T00:00:00Z"
}
```

### `qr_contacts`
Stores synced Google Contacts:
```json
{
  "userId": "user_id",
  "googleContactId": "contact_id",
  "name": "John Doe",
  "phone": "9876543210",
  "email": "john@example.com",
  "source": "google_contacts",
  "syncedAt": "2026-07-29T00:00:00Z"
}
```

### `qr_contact_sync_logs`
Tracks contact sync operations

---

## 🔌 API Endpoints

### Authentication
- `POST /api/admin/crm/qr/auth/email-signup` - Create account
- `POST /api/admin/crm/qr/auth/email-login` - Login (returns JWT)
- `POST /api/admin/crm/qr/auth/google-connect` - OAuth handler

### Backup Operations
- `POST /api/admin/crm/qr/backup/trigger` - Manual backup
- `GET /api/admin/crm/qr/backup/status` - Get backup status

### Contacts Sync
- `POST /api/admin/crm/qr/backup/sync-contacts` - Sync Google Contacts
- `GET /api/admin/crm/qr/backup/sync-contacts` - Get sync status

---

## 🧪 Testing Checklist

### User Flow Testing
- [ ] User creates account with email/password
- [ ] User clicks "Connect Google Drive"
- [ ] Setup modal shows 3-step guide
- [ ] User completes Google auth
- [ ] Backup status shows "Connected"
- [ ] Manual "Backup Now" works
- [ ] Backup shows in history
- [ ] "Sync Google Contacts Now" works
- [ ] Contacts appear in sync status

### Email Verification
- [ ] Email #1: Account email for login
  - User uses this to login to QR WhatsApp
  - Can be any email format
- [ ] Email #2: Google account email
  - This account's Google Drive stores backups
  - Must be a valid Google account
  - Can be same or different from Email #1

### Retention Testing
- [ ] New user defaults to 730 days (2 years)
- [ ] Backups older than retention period are cleaned up
- [ ] Multiple backups tracked in history

### Contacts Testing
- [ ] User has contacts in Google Contacts
- [ ] Click "Sync Google Contacts Now"
- [ ] Contacts appear in sync status
- [ ] Contact count increases
- [ ] Names, phones, emails are imported

---

## 📝 Documentation Files

Available in repo:
1. `QR_WHATSAPP_BACKUP_SETUP.md` - Admin setup guide
2. `QR_WHATSAPP_EMAIL_GUIDE.md` - Email clarification
3. `QR_BACKUP_DEPLOYMENT_GUIDE.md` - This file

---

## ⚠️ Common Issues & Fixes

### "Google OAuth not configured"
- [ ] Add GOOGLE_CLIENT_ID to .env.production
- [ ] Add GOOGLE_CLIENT_SECRET to .env.production
- [ ] Restart the app
- [ ] Try again

### "Invalid redirect URI"
- [ ] Check exact match in Google Console
- [ ] For prod: `https://swaryoga.com/api/admin/crm/qr/auth/google-connect/callback`
- [ ] For local: `http://localhost:3000/api/admin/crm/qr/auth/google-connect/callback`

### "Contacts not syncing"
- [ ] Ensure Google Drive is connected first
- [ ] Check user has contacts in Google Contacts
- [ ] Click "Sync Google Contacts Now"
- [ ] Check browser console for errors

### "Backup shows wrong email"
- [ ] That's the Google account email (Email #2)
- [ ] This is where backups are stored
- [ ] Correct behavior!

---

## 🎉 Ready for Testing!

All code is committed and pushed. Deploy with:

```bash
git pull origin main
# Build and restart your app
```

---

## Next Steps (Future Phases)

### Phase 4: Auto-Sync Scheduler
- Daily automatic backups (not yet implemented)
- Scheduled via cron job or Lambda

### Phase 5: Restore & Download
- Restore chats from backup
- Export as CSV/JSON
- Full data recovery

### Phase 6: Advanced Features
- Backup encryption
- Sharing backups
- Team backup management

---

## Questions?

Check the interactive guides in the app:
1. Click "Connect Google Drive" for setup guide
2. Check Settings tab for backup status
3. Click "Sync Google Contacts Now" for contacts

All guides are built into the UI!
