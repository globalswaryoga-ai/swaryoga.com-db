# 🔧 Copy-Paste Implementation Guide

## Step-by-Step: How to Implement Persistence for ANY Page

---

## 📝 Step 1: Update Database Schema

**File:** `lib/db.ts`

Find the User schema definition and add these fields:

```typescript
// Around line 85-90 in the User schema, add:
lifePlannerEvents: [mongoose.Schema.Types.Mixed],
lifePlannerNotes: [mongoose.Schema.Types.Mixed],
lifePlannerBudget: mongoose.Schema.Types.Mixed,
lifePlannerReminders: [mongoose.Schema.Types.Mixed],
lifePlannerCalendarEvents: [mongoose.Schema.Types.Mixed],
lifePlannerPeriodPlans: mongoose.Schema.Types.Mixed,
lifePlannerActionPlans: [mongoose.Schema.Types.Mixed],
```

---

## 🌐 Step 2: Create API Endpoint

**Pattern:** Create `/api/life-planner/[dataType]/route.ts`

### Example: Events API
**File:** `app/api/life-planner/events/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { User } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await User.findOne({ email: decoded.userId }).lean();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const events = user.lifePlannerEvents || [];
    
    return NextResponse.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { events } = body;
    
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Events must be an array' }, { status: 400 });
    }
    
    const result = await User.updateOne(
      { email: decoded.userId },
      { $set: { lifePlannerEvents: events } }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: events,
      message: 'Events saved successfully'
    });
  } catch (error) {
    console.error('Error saving events:', error);
    return NextResponse.json({ error: 'Failed to save events' }, { status: 500 });
  }
}
```

---

## 💾 Step 3: Add Storage Methods

**File:** `lib/lifePlannerMongoStorage.ts`

Add these methods (one for each data type):

```typescript
// For Events
export async function getEvents(): Promise<any[]> {
  try {
    const token = localStorage.getItem('auth_token') || sessionManager.getToken();
    if (!token) return [];
    
    const response = await fetch('/api/life-planner/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting events:', error);
    return [];
  }
}

export async function saveEvents(events: any[]): Promise<void> {
  try {
    const token = localStorage.getItem('auth_token') || sessionManager.getToken();
    if (!token) return;
    
    const response = await fetch('/api/life-planner/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ events })
    });
    
    if (!response.ok) {
      console.error('Failed to save events');
    }
  } catch (error) {
    console.error('Error saving events:', error);
  }
}

// For Notes (repeat pattern)
export async function getNotes(): Promise<any[]> {
  // Same pattern as getEvents, but use '/api/life-planner/notes'
}

export async function saveNotes(notes: any[]): Promise<void> {
  // Same pattern as saveEvents, but use '/api/life-planner/notes'
}

// For Todos, Reminders, Budget... (repeat same pattern)
```

---

## ⚛️ Step 4: Update Component

**Pattern:** Apply to `/app/life-planner/dashboard/[page]/page.tsx`

### Example: Events Page
**File:** `app/life-planner/dashboard/events/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import * as lifePlannerStorage from '@/lib/lifePlannerMongoStorage';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1️⃣ LOAD DATA ON MOUNT
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const savedEvents = await lifePlannerStorage.getEvents();
        if (savedEvents && savedEvents.length > 0) {
          setEvents(savedEvents);
        } else {
          // Fallback to localStorage for legacy data
          const legacy = localStorage.getItem('events');
          if (legacy) {
            setEvents(JSON.parse(legacy));
          }
        }
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadEvents();
  }, []);

  // 2️⃣ AUTO-SAVE ON DATA CHANGE (with debounce)
  useEffect(() => {
    if (!loading && events.length > 0) {
      const timer = setTimeout(() => {
        lifePlannerStorage.saveEvents(events);
        localStorage.setItem('events', JSON.stringify(events)); // Also keep localStorage for speed
      }, 500); // Wait 500ms after last change
      
      return () => clearTimeout(timer);
    }
  }, [events, loading]);

  // 3️⃣ HANDLE ADD EVENT
  const handleAddEvent = (newEvent: any) => {
    setEvents([...events, newEvent]);
  };

  // 4️⃣ HANDLE DELETE EVENT
  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  // 5️⃣ HANDLE EDIT EVENT
  const handleEditEvent = (id: string, updated: any) => {
    setEvents(events.map(e => e.id === id ? updated : e));
  };

  if (loading) return <div>Loading events...</div>;

  return (
    <div>
      {/* Your event list UI here */}
      {events.map(event => (
        <div key={event.id}>
          <h3>{event.title}</h3>
          <button onClick={() => handleDeleteEvent(event.id)}>Delete</button>
        </div>
      ))}
      
      {/* Add event form */}
      <button onClick={() => handleAddEvent({ id: Date.now(), title: 'New Event' })}>
        Add Event
      </button>
    </div>
  );
}
```

---

## 🎯 Copy-Paste Checklist

For **EACH** page (Events, Todos, Notes, etc.):

1. ✅ Copy API endpoint template → Change `lifePlannerEvents` to your field name
2. ✅ Copy storage methods → Change `getEvents/saveEvents` to your names
3. ✅ Copy component pattern → Change event-related logic to your data type
4. ✅ Update field names in database schema
5. ✅ Test: Add data → Refresh → Data persists

---

## 🔄 Implementation Examples for Other Pages

### For TODOS Page

**Replace:**
- `lifePlannerEvents` → `lifePlannerTodos` (field name)
- `/api/life-planner/events` → `/api/life-planner/todos` (endpoint)
- `getEvents/saveEvents` → `getTodos/saveTodos` (method names)
- `events` → `todos` (variable names)

### For NOTES Page

**Replace:**
- `lifePlannerEvents` → `lifePlannerNotes`
- `/api/life-planner/events` → `/api/life-planner/notes`
- `getEvents/saveEvents` → `getNotes/saveNotes`
- `events` → `notes`

### For BUDGET Page

**Replace:**
- `lifePlannerEvents` → `lifePlannerBudget` (Note: NOT an array, just object)
- `/api/life-planner/events` → `/api/life-planner/budget`
- `getEvents/saveEvents` → `getBudget/saveBudget`
- In API: Change `$set: { lifePlannerBudget: budget }` (not array format)

---

## ✅ Verification Tests

After implementation, test each feature:

```bash
# Test 1: Data Saves
1. Add new event
2. Wait 500ms (auto-save should trigger)
3. Open browser DevTools → Network → See POST request successful

# Test 2: Data Persists
1. Add new event
2. Refresh page (Cmd+R)
3. Verify event still appears

# Test 3: Browser Restart
1. Add new event
2. Close browser completely
3. Reopen browser
4. Navigate to page
5. Verify event still appears

# Test 4: Data Isolation
1. Log in as User A
2. Add event "User A Event"
3. Log out
4. Log in as User B
5. Verify User B doesn't see "User A Event"

# Test 5: Edit & Delete
1. Add event
2. Edit event
3. Refresh → Verify edit persists
4. Delete event
5. Refresh → Verify deletion persists
```

---

## 🚀 Implementation Order (Fastest Path)

1. **Start:** Update `lib/db.ts` schema (add all 7 fields at once)
2. **Create APIs:** Create all 6 critical endpoints (Events, Todos, Notes, Diamond People, Reminders, Budget)
3. **Add Methods:** Add all storage methods to `lifePlannerMongoStorage.ts`
4. **Update Components:** Update each of 6 pages with load + auto-save logic
5. **Test:** Test each page thoroughly
6. **Commit:** Commit entire batch to GitHub

---

## 📊 Time Estimate

- Schema update: 5 minutes
- 1 API endpoint: 15 minutes
- 1 Storage method pair: 5 minutes
- 1 Component update: 20 minutes
- Testing 1 page: 10 minutes

**Total per page:** ~50 minutes
**6 critical pages:** ~5 hours
**All 11 pages:** ~9 hours (about 1 full day of focused work)

---

## ⚠️ Common Mistakes to Avoid

❌ Don't: Use different field names in schema vs API vs component
✅ Do: Use consistent names (e.g., `lifePlannerEvents` everywhere)

❌ Don't: Forget the Bearer token in API calls
✅ Do: Always include `Authorization: Bearer ${token}`

❌ Don't: Remove localStorage auto-save before testing MongoDB
✅ Do: Keep both until you verify MongoDB works, then remove localStorage gradually

❌ Don't: Use synchronous localStorage in components
✅ Do: Use async API calls and handle loading states

---

## 🎉 When Complete

All 11 pages will:
- ✅ Auto-save to MongoDB when data changes
- ✅ Restore from MongoDB on page refresh
- ✅ Restore from MongoDB on browser restart
- ✅ Keep data isolated per user
- ✅ Zero data loss for any user
