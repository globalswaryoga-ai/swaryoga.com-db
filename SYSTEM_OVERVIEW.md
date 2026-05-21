# 3-Layer Data Architecture System Overview

## What is This System?

This is a complete automated backup and data distribution system designed to:
1. **Reduce MongoDB costs** from $150/month to $13/month (91% savings)
2. **Improve global performance** using Bunny CDN
3. **Ensure data safety** with automated backups and weekly syncing
4. **Enable worldwide access** with distributed JSON data

---

## The 3 Layers Explained

### 🔴 LAYER 1: Bunny CDN (Your Primary User Data)
**What**: Global CDN with unlimited storage
**Where**: User data stored as JSON files at `/data/` directory
**When Updated**: Every day at 3:00 AM UTC
**How Users Access**: `GET /api/data/fetch-from-bunny?collection=Course&query=yoga`
**Benefits**:
- Fast worldwide access (low latency)
- No MongoDB load
- Unlimited storage
- Cost: $5-10/month

### 🟡 LAYER 2: MongoDB Atlas (Temporary Working Data)
**What**: Your main MongoDB database
**Where**: Cloud at MongoDB Atlas
**When Cleaned**: Auto-cleanup on weekly sync (older than 7 days deleted)
**How Used**: Real-time queries and API operations
**Size Target**: ~1GB (was 3.4GB, now minimal)
**Cost**: $13/month (was $150/month)

### 🟢 LAYER 3: Local MongoDB (Your Computer - Emergency Backup)
**What**: Complete database backup on your machine
**Where**: `mongodb://localhost:27017`
**When Updated**: Every Sunday at 2:00 AM UTC
**How Restored**: Can be used if Atlas fails
**Benefits**:
- You own the data
- Offline access for development
- Emergency recovery point
- No additional cost (your hardware)

---

## Automated Processes

### Process 1: Daily Backup (2:00 AM UTC)
```
MongoDB Atlas → Export → Compress (GZIP) 
→ Encrypt (AES-256) → Upload to Bunny /backups/
```
**Purpose**: Disaster recovery backup
**Retention**: 30 days + HOT/WARM/COLD tiering
**Verification**: Checksum validation
**Files**: Encrypted, compressed, ~330MB

### Process 2: Daily Data Export (3:00 AM UTC)
```
MongoDB Atlas → Export Collections → JSON Format 
→ Upload to Bunny /data/
```
**Purpose**: User data access via CDN
**Collections**: Course, Workshop, Sadhana, Videos, Users, etc.
**Format**: Unencrypted JSON (readable by frontend)
**Files**: One JSON file per collection

### Process 3: Weekly Local Sync (Sunday 2:00 AM UTC)
```
MongoDB Atlas → mongodump → Tar → Gzip 
→ Upload to Bunny → Restore to Local 
→ Verify → Cleanup Atlas (>7 days)
```
**Purpose**: Keep local backup fresh
**Destination**: Your local MongoDB
**Verification**: Document count matching
**Cleanup**: Removes old data from Atlas to save costs

---

## How Users Get Data

### User Scenario 1: View Courses
```
User clicks "Courses" → Frontend calls /api/data/fetch-from-bunny?collection=Course
→ Bunny CDN returns JSON → Page displays data
```
**Result**: Fast, global access. No MongoDB hit.

### User Scenario 2: Search Courses
```
User types "yoga" → Frontend calls /api/data/fetch-from-bunny?collection=Course&query=yoga
→ Bunny returns filtered results → Page displays
```
**Result**: Fast search across JSON. No database load.

---

## File Locations

### On Bunny CDN
```
/data/                          # User-facing data (JSON)
├── Course.json                 # All courses
├── Workshop.json               # All workshops
├── Sadhana.json                # All sadhana programs
├── Video.json                  # All videos
└── ...                         # Other collections

/backups/mongodb/               # Disaster recovery backups
├── YYYY-MM-DD/                 # Backup date folder
│   ├── backup-{id}.gz          # Encrypted backup
│   └── metadata.json           # Backup metadata
└── ...

/weekly-backups/                # Weekly local sync backups
├── weekly-YYYY-MM-DD.tar.gz   # Complete database dump
└── ...
```

### On Your Computer
```
mongodb://localhost:27017       # Local MongoDB (updated weekly)
.logs/backup/                   # Backup logs
├── backup-2026-05-21.log
├── export-2026-05-21.log
└── sync-2026-05-21.log
```

### On GitHub
```
.env.local                      # Credentials (don't commit!)
DEPLOYMENT_CHECKLIST.md         # This checklist
SYSTEM_OVERVIEW.md              # This document
lib/backup/                     # All backup code
app/api/backup/                 # Status endpoints
app/api/data/                   # User data endpoints
```

---

## Admin Endpoints

### Check Everything is Working
```bash
# System health (all 3 layers)
curl -H "Authorization: Bearer ${BACKUP_API_KEY}" \
  https://your-domain.com/api/backup/system-health

# Backup status
curl -H "Authorization: Bearer ${BACKUP_API_KEY}" \
  https://your-domain.com/api/backup/status

# Daily export status
curl -H "Authorization: Bearer ${BACKUP_API_KEY}" \
  https://your-domain.com/api/backup/daily-export

# List backups
curl -H "Authorization: Bearer ${BACKUP_API_KEY}" \
  https://your-domain.com/api/backup/restore?action=list
```

---

## Cost Breakdown

### Before This System
- MongoDB Atlas: $150/month (3.4GB storage)
- Bunny CDN: $0
- Local backup: $0
- **Total: $150/month**

### After This System
- MongoDB Atlas: $13/month (7-day only)
- Bunny CDN: $5-10/month (unlimited)
- Local backup: $0 (your hardware)
- **Total: $13-20/month**

### Savings: **$130-137/month (91% reduction!)**

---

## Data Retention Policies

### Layer 1 (Bunny CDN - User Data)
- **Latest export**: Always available (3 AM UTC daily)
- **Retention**: Unlimited (updated daily, replaces old)
- **Purpose**: User access
- **Recovery time**: Immediate

### Layer 1 (Bunny CDN - Backups)
- **HOT tier**: Last 7 days (fast retrieval)
- **WARM tier**: 7-30 days (slower retrieval)
- **COLD tier**: 30+ days (archived)
- **Total retention**: 30+ days
- **Recovery time**: 5-60 minutes

### Layer 2 (MongoDB Atlas)
- **Retention**: 7 days (auto-cleanup)
- **Size**: ~1GB
- **Purpose**: Real-time operations
- **Cost**: $13/month

### Layer 3 (Local MongoDB)
- **Retention**: 1 week (updated every Sunday)
- **Size**: ~3.4GB (complete backup)
- **Purpose**: Disaster recovery
- **Recovery time**: Manual restore (15-30 minutes)

---

## Security

### Encryption
- **Backup files**: AES-256-GCM encrypted
- **API access**: Bearer token authentication
- **Credentials**: Stored in `.env.local` (not in git)

### Authentication
- Backup API endpoints protected with `BACKUP_API_KEY`
- User data endpoint (`fetch-from-bunny`) is public (no auth)
- Admin endpoints require API key

### Backups
- Checksum validation on restore
- Compression reduces file size
- Automatic retries on failure
- Detailed logging of all operations

---

## Troubleshooting

### If backup fails
1. Check MongoDB connection: `curl /api/backup/status`
2. Check Bunny connection: Look for error in `.logs/backup/`
3. Verify `BUNNY_STORAGE_KEY` is correct
4. Check disk space on your server

### If export fails
1. Check collection exists: `db.getCollectionNames()`
2. Check Bunny storage: `/api/backup/daily-export`
3. Verify JSON serialization works
4. Check disk space

### If weekly sync fails
1. Ensure local MongoDB is running: `mongosh`
2. Check Atlas connection: `curl /api/backup/system-health`
3. Verify `mongodump` is installed: `mongodump --version`
4. Check logs: `.logs/backup/sync-*.log`

### If user data fetch is slow
1. Check Bunny CDN status
2. Verify `/data/*.json` files exist
3. Check collection size (too large files take time)
4. Consider pagination with `limit` parameter

---

## Next Steps

1. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "feat: 3-layer data architecture"
   git push origin main
   ```

2. **Monitor First Execution**
   - Check logs at `.logs/backup/` on 2:00 AM UTC
   - Verify backups in Bunny `/backups/` folder
   - Check exports in Bunny `/data/` folder

3. **Update Frontend** (optional)
   - Replace direct MongoDB queries with `/api/data/fetch-from-bunny`
   - This improves performance and reduces costs

4. **Verify Cost Reduction**
   - Monitor MongoDB Atlas size (should be ~1GB)
   - Check next billing cycle cost (should be ~$13)
   - Compare with previous $150/month

---

## Reference

- **Bunny CDN**: https://bunny.net
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Node-cron**: https://www.npmjs.com/package/node-cron
- **Environment**: See `.env.local` for all configuration

---

## Questions?

Check the logs:
```bash
# View latest backup log
cat .logs/backup/backup-$(date +%Y-%m-%d).log

# View latest export log
cat .logs/backup/export-$(date +%Y-%m-%d).log

# View latest sync log
cat .logs/backup/sync-*.log
```

Or check the status endpoints:
```bash
curl -H "Authorization: Bearer ${BACKUP_API_KEY}" \
  https://your-domain.com/api/backup/system-health
```

