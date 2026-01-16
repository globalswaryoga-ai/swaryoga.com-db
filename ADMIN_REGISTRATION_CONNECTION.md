# Admin Workshop Dates ↔ Registration Page Connection

## System Overview

The admin workshop dates page and the registration page are **fully connected**. Here's how they work together:

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN WORKFLOW: /app/admin/workshops/schedules/page.tsx     │
│                                                              │
│ 1. Admin logs in with adminToken                            │
│ 2. Selects Workshop Category → Mode → Language              │
│ 3. Clicks "Add Date" button                                 │
│ 4. Fills in: Start/End Date, Time, Fees, Seats, Location   │
│ 5. Clicks "Save" button                                     │
│    → Saves to MongoDB via POST /api/admin/workshops/schedules/crud
│    → Status: "Draft" (not visible to users yet)            │
│ 6. Clicks "Publish" button                                  │
│    → Updates status to "Published" via PUT API             │
│    → NOW VISIBLE TO USERS                                  │
│                                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Syncs via MongoDB
                         │ WorkshopSchedule collection
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ USER WORKFLOW: /app/registration/[mode]/[language]/[workshop]
│                                                              │
│ 1. User lands on registration page                          │
│ 2. System fetches published schedules                       │
│    → GET /api/workshops/schedules?workshopSlug=...         │
│    → Only returns status="published" schedules             │
│ 3. User selects date/batch from available dates            │
│ 4. Clicks "Enroll Now"                                      │
│    → Adds workshop to cart                                  │
│    → Redirects to checkout                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

All schedules are stored in MongoDB collection: `WorkshopSchedule`

```typescript
{
  _id: string;                    // Auto-generated ID
  workshopSlug: string;           // e.g., "swar-yoga-basic-program"
  workshopName: string;           // e.g., "Swar Yoga Basic Program"
  mode: string;                   // "online" | "offline" | "residential" | "recorded"
  language: string;               // "Hindi" | "English" | "Marathi"
  batch: string;                  // e.g., "morning", "evening"
  startDate: Date;                // When the workshop starts
  endDate: Date;                  // When the workshop ends
  time: string;                   // e.g., "7:00 PM - 8:30 PM"
  seatsTotal: number;             // Total available seats
  price: number;                  // Fee amount
  currency: string;               // "INR" | "USD" | "NPR"
  status: "draft" | "published";  // Controls visibility
  publishedAt?: Date;             // When it was published
}
```

## API Endpoints

### Admin Creates/Updates Schedules

**POST** `/api/admin/workshops/schedules/crud`
- Creates a new workshop schedule
- Requires: `Authorization: Bearer {adminToken}`
- Automatically sets `status: "published"` when created

**PUT** `/api/admin/workshops/schedules/crud`
- Updates an existing schedule
- Can change status from "draft" ↔ "published"
- Body: `{ id, status, ...updates }`

**GET** `/api/admin/workshops/schedules`
- Admin fetches all schedules (draft + published)
- Returns: Array of all schedules

### Public Registration Page Fetches Schedules

**GET** `/api/workshops/schedules`
- Public endpoint (no token required)
- Filters: Only returns `status: "published"` schedules
- Query params:
  - `workshopSlug` - Filter by workshop
  - `mode` - Filter by mode (online/offline/etc)
  - `language` - Filter by language

## Troubleshooting: Why Schedules Don't Show on Registration Page

### Issue 1: Schedule is in "Draft" Status

**Symptom:** You saved a schedule but it doesn't show on the registration page.

**Solution:** Click the "Publish" button next to the schedule.
- ✗ Draft status = invisible to users
- ✓ Published status = visible to users

### Issue 2: Admin Token is Missing or Invalid

**Symptom:** You see an error when trying to save or get a 401/Unauthorized error.

**Solution:** 
1. Go to `/admin/login` and log in again
2. The token is stored in `localStorage.adminToken`
3. Check browser DevTools → Application → Local Storage

### Issue 3: Incorrect Workshop/Mode/Language Combination

**Symptom:** Schedule is published but doesn't show on the registration page.

**Solution:** Ensure:
1. ✓ Workshop slug matches exactly (e.g., "swar-yoga-basic-program")
2. ✓ Mode matches (e.g., "online")
3. ✓ Language matches (e.g., "Hindi")
4. ✓ Status is "Published"

### Issue 4: Registration Page Shows "No Dates Available"

**Symptom:** Registration page loads but shows "Coming soon" for all months.

**Solution:** Check that:
1. ✓ At least one schedule is Published
2. ✓ The schedule has a valid `startDate`
3. ✓ The schedule's dates fall within the next 6 months

## Step-by-Step: Publishing a Workshop Date

1. **Go to Admin Page**
   ```
   /app/admin/workshops/schedules/page.tsx
   ```

2. **Select Category**
   - Click on "Health", "Wealth", etc. in left sidebar

3. **Select Workshop**
   - Click on workshop name in the list

4. **Select Mode & Language**
   - Choose "Online", "Offline", "Residential", etc.
   - Choose "Hindi", "English", "Marathi", etc.

5. **Click "Add Date"**
   - Button appears in top-right

6. **Fill in Details**
   - **Start Date**: When workshop begins
   - **End Date**: When workshop ends
   - **Time**: e.g., "7:00 PM - 8:30 PM"
   - **Fees**: Amount (e.g., 145)
   - **Currency**: INR, USD, or NPR
   - **Seats**: Total participants allowed
   - **Language**: Hindi/English/Marathi
   - **Location**: Optional (for offline/residential)

7. **Click "Save"**
   - Status becomes "Draft"
   - ✓ You'll see: "Schedule saved successfully!"

8. **Click "Publish"**
   - Status changes from Draft → Published
   - ✓ You'll see: "Schedule published successfully!"
   - ✓ Users can now see it on registration page

9. **Verify on Registration Page**
   - Go to: `/registration/online/hindi/swar-yoga-basic-program`
   - Your date should appear in the date selector

## Success Messages

| Message | Meaning |
|---------|---------|
| ✓ Schedule created successfully! | New schedule was created |
| ✓ Schedule saved successfully! | Changes were saved |
| ✓ Schedule published successfully! | Now visible to users |
| ✓ Schedule unpublished successfully! | Hidden from users |
| ✗ [Error message] | Something went wrong (see details) |

## Key Differences: Admin vs User Pages

| Aspect | Admin Page | Registration Page |
|--------|-----------|------------------|
| **URL** | `/app/admin/workshops/schedules` | `/registration/[mode]/[language]/[workshop]` |
| **Auth** | Requires `adminToken` | Public (no auth) |
| **Sees** | All schedules (draft + published) | Only published schedules |
| **Can Do** | Create, Edit, Delete, Publish/Unpublish | View dates and register |
| **Database** | Reads/Writes to `WorkshopSchedule` | Only reads published ones |

## Integration Points

1. **MongoDB WorkshopSchedule Collection**
   - Single source of truth for all workshop dates
   - Both admin and user pages access the same data

2. **Status Flag**
   - Controls visibility: `draft` vs `published`
   - Admin page shows both, user page filters to published only

3. **API Endpoints**
   - Admin uses: `/api/admin/workshops/schedules/crud` (protected)
   - Users use: `/api/workshops/schedules` (public, filtered)

4. **Real-time Updates**
   - When admin publishes → users see it immediately
   - When admin unpublishes → disappears from user view
   - When admin deletes → gone from everywhere

## Testing the Connection

### Test 1: Create and Publish a Schedule

1. Go to admin page
2. Create a new schedule for "Swar Yoga Basic Program", "Online", "Hindi"
3. Set dates to next week
4. Click "Save" → See success message
5. Click "Publish" → See success message
6. Go to registration page: `/registration/online/hindi/swar-yoga-basic-program`
7. ✓ You should see your date listed

### Test 2: Edit and Save

1. In admin page, click "Edit" on a schedule
2. Change the time
3. Click "Save"
4. Check registration page → See updated time immediately

### Test 3: Unpublish

1. In admin page, click "Unpublish"
2. Go to registration page
3. ✓ Date should disappear from the list

### Test 4: Delete

1. In admin page, click "Delete"
2. Confirm deletion
3. Go to registration page
4. ✓ Date should be gone

## File Locations

- **Admin Page**: `/app/admin/workshops/schedules/page.tsx`
- **Registration Page**: `/app/registration/[mode]/[language]/[workshop]/page.tsx`
- **Admin API**: `/app/api/admin/workshops/schedules/crud/route.ts`
- **Public API**: `/app/api/workshops/schedules/route.ts`
- **Database**: `/lib/db.ts` (WorkshopSchedule model)

---

**Last Updated**: January 17, 2026
**Status**: ✓ Fully Connected and Working
