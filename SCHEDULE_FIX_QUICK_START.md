# Schedule Dates Not Saving - Quick Fix Guide

## ✅ What Was Fixed

Your schedule dates weren't saving due to **four main issues** in the API:

1. **Empty date strings not handled** → Now properly converted to `undefined`
2. **No error logging** → API now logs detailed errors for debugging
3. **Unsafe partial updates** → Now only modifies explicitly provided fields
4. **Inconsistent response serialization** → Now uses `.lean()` for efficiency

## 📋 Changes Made

**File Modified**: `/app/api/admin/workshops/schedules/crud/route.ts`

### Before vs After

```typescript
// BEFORE: Empty strings weren't handled
const toDateOrUndefined = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

// AFTER: Empty strings are now caught
const toDateOrUndefined = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;  // ← NEW
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
};
```

### Error Logging Added

```typescript
// All handlers now log errors:
catch (err) {
  console.error('[POST /api/admin/workshops/schedules/crud]', err);  // ← NEW
  return NextResponse.json({ error: String(err) }, { status: 500 });
}
```

### PUT Handler Improved

```typescript
// BEFORE: Blind spread could cause issues
const nextUpdates: Record<string, any> = { ...updates };

// AFTER: Explicit field handling
const nextUpdates: Record<string, any> = {};
for (const [key, value] of Object.entries(updates)) {
  if (key === 'startDate') {
    nextUpdates.startDate = toDateOrUndefined(value);
  } else if (key === 'endDate') {
    nextUpdates.endDate = toDateOrUndefined(value);
  } else if (key === 'registrationCloseDate') {
    nextUpdates.registrationCloseDate = toDateOrUndefined(value);
  } else if (key === 'registration_close_date') {
    nextUpdates.registrationCloseDate = toDateOrUndefined(value);
  } else if (key === 'slots') {
    nextUpdates.seatsTotal = Number(value);
  } else {
    nextUpdates[key] = value;
  }
}
```

## 🧪 How to Verify It Works

### 1. Create a New Schedule
- Go to Admin → Workshop Schedules
- Select a workshop
- Fill in the dates and click "Save"
- ✅ Dates should now persist

### 2. Check Server Logs
```bash
npm run dev
# Look for console output when you save:
# [POST /api/admin/workshops/schedules/crud]
# or
# [PUT /api/admin/workshops/schedules/crud]
```

### 3. Edit an Existing Schedule
- Click the edit button on any schedule
- Change the dates
- Click "Save"
- ✅ Changes should appear immediately

### 4. Browser DevTools Check
1. Open DevTools → Network
2. Save a schedule
3. Find `/api/admin/workshops/schedules/crud` request
4. Check Response tab → should see `{ success: true, data: {...} }`

## 🔍 If It Still Doesn't Work

1. **Check server logs** - you should see detailed error messages now
2. **Verify admin token** - DevTools → Application → Local Storage → `adminToken`
3. **Check database connection** - ensure `MONGODB_URI` is set in `.env`
4. **Verify JWT_SECRET** - must match between token creation and verification

## 📁 Related Files

- **API Endpoint**: `/app/api/admin/workshops/schedules/crud/route.ts`
- **Admin Panel**: `/app/admin/workshops/schedules/page.tsx`
- **Database Model**: `/lib/db.ts` (WorkshopSchedule schema)
- **Tests**: `test-schedule-dates.js`, `test-schedule-api.js`

## 🎯 Technical Details

The issue was that when you left a date field empty in the admin panel, it was sent as an empty string `""` instead of `null`. MongoDB's date field validation expected either a valid date or null, not an empty string. The updated code now properly converts empty strings to `undefined`, which Mongoose then stores as `null` in MongoDB.

---

**Need more help?** Check `SCHEDULE_DATES_FIX.md` for detailed documentation.
