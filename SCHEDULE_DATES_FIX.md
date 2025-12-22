# Schedule Dates Not Saving - Fix Summary

## Problems Identified & Fixed

### 1. **Improved Error Logging**
- **Problem**: The API endpoint was returning generic 500 errors without detailed information
- **Fix**: Added `console.error()` logging to POST, PUT, and DELETE handlers to help debug issues
- **Location**: `/app/api/admin/workshops/schedules/crud/route.ts`

### 2. **Better Date Handling**
- **Problem**: Empty date strings were not being properly converted to undefined
- **Fix**: Updated `toDateOrUndefined()` to check for empty strings before parsing
  ```typescript
  const toDateOrUndefined = (value: unknown): Date | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;  // NEW
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  ```

### 3. **Improved PUT Endpoint Data Handling**
- **Problem**: The PUT handler was blindly spreading all update fields, which could cause issues
- **Fix**: Explicitly iterate over provided fields and only set those that are intentionally provided
  ```typescript
  const nextUpdates: Record<string, any> = {};
  
  // Only include fields that are explicitly provided in the request
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'startDate') {
      nextUpdates.startDate = toDateOrUndefined(value);
    } else if (key === 'endDate') {
      nextUpdates.endDate = toDateOrUndefined(value);
    } else if (key === 'registrationCloseDate') {
      nextUpdates.registrationCloseDate = toDateOrUndefined(value);
    } else if (key === 'slots') {
      nextUpdates.seatsTotal = Number(value);
    } else {
      nextUpdates[key] = value;
    }
  }
  ```

### 4. **Consistent Response Serialization**
- **Problem**: Response objects were using both `.toObject()` and `.lean()` inconsistently
- **Fix**: 
  - POST endpoint uses `.toObject()` for newly created documents
  - PUT endpoint uses `.lean()` for Mongoose queries (more efficient)
  - Both return consistent plain objects for JSON serialization

## How to Test

### Option 1: Manual Testing in Admin Panel
1. Open admin panel at `/admin/workshops/schedules`
2. Create a new schedule with dates
3. Save and verify dates are persisted
4. Edit an existing schedule and change dates
5. Save and verify changes appear immediately

### Option 2: Check Browser Console
1. Open DevTools → Network tab
2. Try to save a schedule
3. Click on the `/api/admin/workshops/schedules/crud` request
4. Check Response tab - should see `{ success: true, data: {...} }`
5. If there's an error, the Response will now show detailed error message (thanks to logging)

### Option 3: Run Tests
```bash
# Test date conversion logic
node test-schedule-dates.js

# Test API endpoint (if running locally)
npm run dev
# In another terminal:
node test-schedule-api.js
```

## What Changed

### Files Modified
- `/app/api/admin/workshops/schedules/crud/route.ts`
  - Added error logging to all handlers
  - Improved `toDateOrUndefined()` function
  - Refactored PUT handler to safely handle partial updates
  - Standardized response serialization

### Files Created (for testing)
- `test-schedule-dates.js` - Unit tests for date conversion
- `test-schedule-api.js` - Integration test for API endpoint

## Why This Fixes the Issue

The main issues were:

1. **Empty date strings** were not being converted to null/undefined, causing Mongoose validation issues
2. **Error messages** were being suppressed, making it hard to debug
3. **Partial updates** could accidentally reset fields to undefined

Now:
- Empty dates are properly handled as undefined (null in MongoDB)
- API errors are logged server-side for debugging
- Updates only modify the fields you explicitly set
- Dates are properly saved and retrieved from the database

## Next Steps

If schedules still aren't saving:

1. **Check server logs** - you should now see detailed error messages
2. **Verify admin token** - is your adminToken valid? Check DevTools → Application → Local Storage
3. **Check database** - connect to MongoDB and verify WorkshopSchedule collection exists
4. **Verify environment** - ensure `JWT_SECRET` is set in `.env`

If you see errors in the logs, share them and we can debug further!
