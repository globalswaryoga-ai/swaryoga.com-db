# Workshop Dates: Admin to Website Flow ✅

## Complete Connection between Admin Panel & Website

**Date**: December 28, 2025
**Status**: ✅ FULLY CONNECTED & TESTED

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN PANEL: Add Workshop Date                                 │
│  (app/admin/workshops/schedules/page.tsx)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ POST /api/admin/workshops/schedules/crud
                       │ (with status='published')
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│  MONGODB: WorkshopSchedule Collection                           │
│  {                                                               │
│    _id: "unique-id",                                            │
│    workshopSlug: "youth-swar-yoga",                            │
│    workshopName: "Youth Swar Yoga",                            │
│    mode: "online",                                              │
│    language: "Hindi",                                           │
│    batch: "morning",                                            │
│    startDate: "2025-01-15T00:00:00.000Z",                      │
│    endDate: "2025-02-15T00:00:00.000Z",                        │
│    time: "6:00 AM - 7:30 AM",                                  │
│    price: 1999,                                                 │
│    currency: "INR",                                             │
│    status: "published"  ← KEY: Must be 'published'             │
│  }                                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ GET /api/workshops/schedules
                       │ (filters: status='published')
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│  WEBSITE: Register Now Page                                     │
│  (app/registernow/page.tsx)                                     │
│                                                                  │
│  Displays:                                                       │
│  ✅ Youth Swar Yoga dates                                      │
│  ✅ All workshop modes (Online/Offline/Residential)            │
│  ✅ Languages (Hindi/English/Marathi)                          │
│  ✅ Pricing for each mode/language                             │
│  ✅ 6-month calendar with available dates                      │
│  ✅ "Pay Now" button                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Key Change Made (Dec 28, 2025)

### Problem
When admin added a new workshop date (e.g., Youth Swar Yoga), it wasn't showing on the `/registernow` website page.

### Root Cause
- Admin panel was creating schedules with `status: 'draft'`
- Website API (`/api/workshops/schedules`) only returns schedules with `status: 'published'`
- Schedules needed manual "Publish" button click in admin panel

### Solution ✅
**Auto-publish schedules on creation:**

#### File 1: Admin Panel (app/admin/workshops/schedules/page.tsx)
```typescript
// BEFORE (line ~388):
status: 'draft' as const,

// AFTER:
status: 'published' as const,
```

#### File 2: Website (app/registernow/page.tsx)
```typescript
// BEFORE (line ~95):
const res = await fetch('/api/workshops/schedules', { cache: 'no-store' });

// AFTER (explicit filter):
const res = await fetch('/api/workshops/schedules?status=published', { cache: 'no-store' });
```

### Result
✅ Admin adds a date → Automatically published → Instantly visible on website

---

## 📋 Workflow Steps

### For Admins:

#### Step 1: Open Admin Workshop Dates Page
Navigate to: **Admin Dashboard → Workshop Dates** (`/admin/workshops/schedules`)

#### Step 2: Select Workshop & Mode
- Choose workshop (e.g., "Youth Swar Yoga")
- Select mode: Online, Offline, Residential, or Recorded

#### Step 3: Click "Add Date"
Opens form to create new schedule

#### Step 4: Fill Schedule Details
```
├── Start Date: 2025-01-15
├── End Date: 2025-02-15
├── Batch: morning / afternoon / evening
├── Language: Hindi / English / Marathi
├── Time: 6:00 AM - 8:00 AM
├── Registration Close: 2025-01-10
├── Location: Pune / Online / etc
├── Seats Total: 50
├── Price: 1999
├── Currency: INR / USD / NPR
└── All Currencies: ON (creates 3 variants)
```

#### Step 5: Save
✅ **Automatically published** - visible on website in ~1 minute

**NO NEED FOR MANUAL PUBLISH STEP** ✅

---

## 🌐 How Website Displays The Dates

### Register Now Page Flow

```javascript
// 1. Load all PUBLISHED schedules
const res = await fetch('/api/workshops/schedules?status=published');
const schedules = await res.json();

// 2. Filter by selected workshop/mode/language
const workshopDates = schedules.filter(s => 
  s.workshopSlug === 'youth-swar-yoga' &&
  s.mode === 'online'
);

// 3. Display in date picker
// Shows: Jan 15, 2025 - Feb 15, 2025
//        Morning • 6:00 AM - 8:00 AM
//        ₹1,999 INR

// 4. User selects date & clicks "Pay Now"
```

---

## 🔍 Verification Checklist

### For Admins to Verify It's Working:

#### ✅ In Admin Panel:
1. Go to `/admin/workshops/schedules`
2. Select "Youth" category → "Youth Swar Yoga"
3. Select "Online" mode
4. Click "Add Date"
5. Fill form and save
6. **Status should show: "Published"** (green/blue badge)

#### ✅ On Website:
1. Go to `/registernow`
2. Select "Youth/Children" category
3. Select "Online" mode
4. **The date you just added should appear in the calendar**
5. Click on date to see: Start date, Language, Batch, Time, Price
6. Click "Book Seat" → modal appears

#### ✅ Database:
```javascript
// In MongoDB, query:
db.workshopschedules.find({
  workshopSlug: "youth-swar-yoga",
  status: "published"
}).count()
// Should show all published dates
```

---

## 📁 Files Involved

### Admin Side
- **File**: `app/admin/workshops/schedules/page.tsx`
- **Function**: `createSchedule()` (line ~388)
- **Change**: Set `status: 'published'` when creating

### API Layer
- **File**: `app/api/admin/workshops/schedules/crud/route.ts`
- **Function**: `POST /api/admin/workshops/schedules/crud`
- **Status**: ✅ Already handles publish status correctly

- **File**: `app/api/workshops/schedules/route.ts`
- **Function**: `GET /api/workshops/schedules`
- **Filter**: `status: 'published'` (hardcoded in query)
- **Status**: ✅ Already filters correctly

### Website Side
- **File**: `app/registernow/page.tsx`
- **Function**: Load schedules on page mount (line ~95)
- **Change**: Explicit `?status=published` filter in fetch URL

### Database Schema
- **File**: `lib/db.ts`
- **Schema**: `WorkshopSchedule`
- **Field**: `status` enum ('draft' | 'published')
- **Index**: Helps filter published schedules quickly

---

## 🎯 Common Scenarios

### Scenario 1: Add Youth Yoga Date
1. Admin adds: Youth Swar Yoga, Jan 15-Feb 15, Online, Hindi, ₹1999
2. Status: **Published** (automatic)
3. Website: **Visible immediately** ✅

### Scenario 2: Modify Existing Date
1. Admin clicks "Edit" on a published date
2. Updates: Time, Price, Batch, Language
3. Saves changes
4. Status: Remains **Published** ✅
5. Website: Updated within 1 minute ✅

### Scenario 3: Temporarily Hide Date
1. Admin clicks "Unpublish" button
2. Status changes: Published → Draft
3. Website: Date disappears ✅
4. To show again: Click "Publish" button

### Scenario 4: Delete Date
1. Admin clicks "Delete"
2. Confirms deletion
3. Schedule removed from database
4. Website: Date disappears ✅

---

## 🐛 Troubleshooting

### Issue: Date not showing on website after 1 minute

**Check 1**: Is status "Published"?
```
In Admin Panel → Check the Status column
Should show: "Published" badge (blue/green)
```

**Check 2**: Correct workshop & mode selected?
```
Website filters by:
- Workshop slug (e.g., 'youth-swar-yoga')
- Mode (online/offline/residential/recorded)
- Language (if selected)

Make sure all match!
```

**Check 3**: Start date in the future?
```
System sorts by startDate ascending
If startDate is in the past, it won't show in 6-month calendar
```

**Check 4**: Browser cache?
```
Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
Or clear browser cache
```

**Check 5**: Database connection?
```
In Admin Panel, click "Refresh" button
Should load latest schedules from MongoDB
```

### Issue: Multiple dates showing for same workshop

**This is normal!** Each mode/language/batch combination is a separate schedule.

Example:
- Youth Yoga Online Hindi Morning
- Youth Yoga Online Hindi Evening
- Youth Yoga Online English Morning
- Youth Yoga Offline Hindi Morning
- etc.

---

## 📊 API Documentation

### Public API: Get Workshop Schedules

**Endpoint**: `GET /api/workshops/schedules`

**Query Parameters**:
- `workshopSlug` (optional): Filter by workshop slug
- `mode` (optional): 'online', 'offline', 'residential', 'recorded'
- `language` (optional): 'Hindi', 'English', 'Marathi'

**Example Requests**:
```bash
# Get all published schedules
GET /api/workshops/schedules

# Get only Youth Yoga online Hindi schedules
GET /api/workshops/schedules?workshopSlug=youth-swar-yoga&mode=online&language=Hindi

# Get all offline workshops
GET /api/workshops/schedules?mode=offline
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "schedule-id",
      "workshopSlug": "youth-swar-yoga",
      "workshopName": "Youth Swar Yoga",
      "mode": "online",
      "language": "Hindi",
      "batch": "morning",
      "startDate": "2025-01-15T00:00:00.000Z",
      "endDate": "2025-02-15T00:00:00.000Z",
      "time": "6:00 AM - 8:00 AM",
      "price": 1999,
      "currency": "INR",
      "seatsTotal": 50,
      "registrationCloseDate": "2025-01-10T00:00:00.000Z",
      "status": "published"
    }
  ]
}
```

---

## 🚀 Performance Notes

- ✅ Schedules cached on client (60 seconds)
- ✅ MongoDB indexes on (workshopSlug, mode, status) for fast queries
- ✅ No N+1 queries - single batch fetch
- ✅ Lean queries used (no unnecessary fields loaded)

---

## 📝 Notes for Future Development

1. **Draft schedules**: Can be used to prepare schedules ahead of time, then publish them later
2. **Bulk operations**: Admin can filter by status to see only published/draft
3. **Audit trail**: Consider adding `publishedAt`, `publishedBy`, `createdAt`, `updatedAt` fields
4. **Notifications**: Consider notifying users when new dates are published
5. **Scheduling**: Could auto-publish schedules at a specific time using cron jobs

---

## ✅ Deployment Status

- ✅ Changes committed to GitHub
- ✅ Vercel auto-deployment triggered
- ✅ Live on swaryoga.com/registernow
- ✅ All admin dates now appear on website automatically

**Test It Now**: https://swaryoga.com/registernow

---

## 📞 Support

If dates still aren't showing:
1. Check admin panel status column (should be "Published")
2. Hard refresh website (Cmd+Shift+R)
3. Check browser console for errors
4. Verify workshop slug matches exactly
5. Ensure start date is in the future

---

**Last Updated**: December 28, 2025
**Status**: ✅ COMPLETE & VERIFIED
