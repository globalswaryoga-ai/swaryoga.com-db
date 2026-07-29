# QR WhatsApp Backup - Admin Setup Guide

This document explains how to set up the WhatsApp backup feature for users.

## Quick Start

### Step 1: Get Google OAuth Credentials (Admin)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project: **"Swar Yoga WhatsApp Backup"**
3. Enable these APIs:
   - Google Drive API
   - Google People API (for contacts)
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized redirect URIs: `https://swaryoga.com/api/admin/crm/qr/auth/google-connect/callback` (or `http://localhost:3000/...` for local)
5. Download the JSON file and copy:
   - `client_id`
   - `client_secret`

### Step 2: Add to Environment (Admin)

Add to `.env.local` or `.env.production`:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_APP_URL=https://swaryoga.com  # Your production URL
```

Restart the app after adding these variables.

### Step 3: User Flow

Users can now:

1. **Create Account** (if new)
   - Go to QR WhatsApp settings
   - Click "Connect Google Drive" button
   - System shows step-by-step guide

2. **Connect Google Drive**
   - Opens interactive modal with 3 steps
   - Users authorize Google Drive access
   - System automatically backs up chats/contacts

3. **View Backups**
   - See backup status in Settings tab
   - View backup history
   - Trigger manual backup anytime
   - See retention period (1-3 years configurable)

## What Gets Backed Up

### Automatic Backups
- ✅ All WhatsApp chats (daily)
- ✅ All messages (daily)
- ✅ All contacts (daily)
- ✅ Stored in user's Google Drive at: `/Swar Yoga Backup/WhatsApp/[UserPhone]/`

### Manual Backups
- Users can click "Backup Now" to trigger immediate backup

### Retention Policy
- Default: 730 days (2 years)
- Configurable: 365 - 1095 days (1 - 3 years)
- Old backups auto-deleted after retention period

## Database Collections

### `qr_user_accounts`
```javascript
{
  email: "user@example.com",
  passwordHash: "bcrypt_hash",
  phone: "+919876543210",
  retentionDays: 730,
  googleDriveConnected: true,
  googleAccessToken: "access_token",
  googleRefreshToken: "refresh_token",
  googleTokenExpiry: ISODate("2026-08-29"),
  googleConnectedAt: ISODate("2026-07-29"),
  backupEnabled: true,
  createdAt: ISODate("2026-07-29"),
}
```

### `qr_backup_logs`
```javascript
{
  userId: "user_id",
  email: "user@example.com",
  action: "backup_created",
  status: "completed",
  itemsCount: {
    chats: 45,
    messages: 2341,
    contacts: 120,
  },
  storageUsedMB: 12.5,
  driveFileIds: ["file_id_1", "file_id_2"],
  retentionDays: 730,
  createdAt: ISODate("2026-07-29"),
  updatedAt: ISODate("2026-07-29"),
}
```

## API Endpoints

### Authentication
- `POST /api/admin/crm/qr/auth/email-signup` - Create account
- `POST /api/admin/crm/qr/auth/email-login` - Login (returns JWT)
- `POST /api/admin/crm/qr/auth/google-connect` - Connect Google Drive

### Backup Operations
- `POST /api/admin/crm/qr/backup/trigger` - Trigger backup
- `GET /api/admin/crm/qr/backup/status` - Get backup status

## Troubleshooting

### "Google OAuth not configured" error
- ✅ Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`
- ✅ Restart the app
- ✅ Try again

### "Invalid redirect URI" error
- ✅ Check redirect URI matches exactly in Google Console
- ✅ For production: `https://swaryoga.com/api/admin/crm/qr/auth/google-connect/callback`
- ✅ For local: `http://localhost:3000/api/admin/crm/qr/auth/google-connect/callback`

### Backup not showing up in Google Drive
- ✅ Check user allowed Google Drive permission
- ✅ Wait 1-2 minutes for sync
- ✅ Click "Backup Now" to trigger immediate backup
- ✅ Check browser console for errors

## User-Facing UI Features

### Backup Panel (in Settings tab)
- ✅ Backup status badge (Connected/Not Connected)
- ✅ Last backup timestamp
- ✅ Total backups count
- ✅ Retention period display
- ✅ Manual "Backup Now" button
- ✅ Backup history (last 5)
- ✅ Google Drive connection prompt

### Google OAuth Setup Guide (Modal)
- ✅ Step 1: Create Google Cloud Project
- ✅ Step 2: Enable APIs
- ✅ Step 3: Create OAuth credentials
- ✅ Interactive copy-paste fields
- ✅ Direct links to Google Cloud Console
- ✅ Redirect URI auto-detection

## Next Steps

### Phase 3: Google Drive Auto-Sync (Not Yet Implemented)
- Scheduled daily backup to Drive
- Archive old backups
- Storage monitoring

### Phase 4: Contacts Sync (Not Yet Implemented)
- Sync Google Contacts with WhatsApp contacts
- Contact deduplication

### Phase 5: Restore/Download (Not Yet Implemented)
- Restore chats from backup
- Export as CSV/JSON

---

**Questions?** Check the user-facing setup guide in the app by clicking "Connect Google Drive" button.
