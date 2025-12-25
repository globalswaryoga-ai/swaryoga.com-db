# 📋 Database Schema Update

## Current User Schema (lib/db.ts)

The User schema already has these life planner fields working:
- ✅ `lifePlannerVisions`
- ✅ `lifePlannerGoals`
- ✅ `lifePlannerTasks`
- ✅ `lifePlannerTodos`
- ✅ `lifePlannerWords`
- ✅ `lifePlannerReminders`
- ✅ `lifePlannerHealthRoutines`
- ✅ `lifePlannerDailyHealthPlans`
- ✅ `lifePlannerDailyTasks` (RECENTLY ADDED - commit 8a02771)
- ✅ `lifePlannerDiamondPeople`
- ✅ `lifePlannerProgress`

## ❌ MISSING Fields (Need to Add)

### In lib/db.ts, find the User schema and ADD:

```typescript
lifePlannerEvents: [mongoose.Schema.Types.Mixed],        // Array of events
lifePlannerNotes: [mongoose.Schema.Types.Mixed],         // Array of notes
lifePlannerBudget: mongoose.Schema.Types.Mixed,          // Budget object (NOT array)
lifePlannerCalendarEvents: [mongoose.Schema.Types.Mixed], // Array of custom calendar events
lifePlannerPeriodPlans: mongoose.Schema.Types.Mixed,     // Object with weekly/monthly/yearly plans
lifePlannerActionPlans: [mongoose.Schema.Types.Mixed],   // Array of action plans
```

---

## 📍 EXACT LOCATION IN lib/db.ts

1. Open `lib/db.ts`
2. Find the User schema definition (around line 58-100)
3. Locate the existing `lifePlanner*` fields
4. ADD the 6 new fields below them

### Example of where to add:

```typescript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  // ... other fields ...

  // EXISTING LIFE PLANNER FIELDS (keep these)
  lifePlannerVisions: [mongoose.Schema.Types.Mixed],
  lifePlannerGoals: [mongoose.Schema.Types.Mixed],
  lifePlannerTasks: [mongoose.Schema.Types.Mixed],
  lifePlannerTodos: [mongoose.Schema.Types.Mixed],
  lifePlannerWords: [mongoose.Schema.Types.Mixed],
  lifePlannerReminders: [mongoose.Schema.Types.Mixed],
  lifePlannerHealthRoutines: [mongoose.Schema.Types.Mixed],
  lifePlannerDailyHealthPlans: [mongoose.Schema.Types.Mixed],
  lifePlannerDailyTasks: mongoose.Schema.Types.Mixed,
  lifePlannerDiamondPeople: [mongoose.Schema.Types.Mixed],
  lifePlannerProgress: [mongoose.Schema.Types.Mixed],

  // ➕ ADD THESE 6 NEW FIELDS:
  lifePlannerEvents: [mongoose.Schema.Types.Mixed],
  lifePlannerNotes: [mongoose.Schema.Types.Mixed],
  lifePlannerBudget: mongoose.Schema.Types.Mixed,
  lifePlannerCalendarEvents: [mongoose.Schema.Types.Mixed],
  lifePlannerPeriodPlans: mongoose.Schema.Types.Mixed,
  lifePlannerActionPlans: [mongoose.Schema.Types.Mixed],

  // ... timestamps and other fields ...
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

---

## 📝 Array vs Object Fields Explanation

### ARRAY Format (use for lists):
```typescript
lifePlannerEvents: [mongoose.Schema.Types.Mixed]
// Stores: [ { id: 1, title: 'Event 1' }, { id: 2, title: 'Event 2' } ]
// Use for: Events, Notes, Todos, Reminders, Calendar Events, Action Plans
```

### OBJECT Format (use for single objects):
```typescript
lifePlannerBudget: mongoose.Schema.Types.Mixed
// Stores: { total: 5000, categories: { ... } }
// Use for: Budget, Period Plans (storing week/month/year data together)
```

---

## ✅ Verification After Update

After adding fields, test with:

```bash
# 1. Check if new user creation still works
node -e "
require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = require('./lib/db.ts');
  console.log('✅ Schema loaded successfully');
  console.log('Available fields:');
  Object.keys(db.User.schema.paths).filter(f => f.includes('lifeP')).forEach(f => console.log('  -', f));
  process.exit(0);
}

test().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
"
```

---

## 🔄 Migration Note

**Will existing data be affected?**
- ✅ **NO** - New fields default to `undefined` or empty arrays
- ✅ **Safe** - Existing users won't lose their data
- ✅ **Backward compatible** - Old apps will still work

**What about existing records?**
- New queries will just return `undefined` for missing fields
- When user saves data for first time, MongoDB auto-creates the field
- No need to migrate existing user records

---

## 📊 Final Schema Reference

After update, User schema will have:

| Field Name | Type | Purpose |
|------------|------|---------|
| lifePlannerVisions | Array | Vision statements |
| lifePlannerGoals | Array | Goals list |
| lifePlannerTasks | Array | Task list |
| lifePlannerTodos | Array | Todo items |
| lifePlannerWords | Array | Inspiration words |
| lifePlannerReminders | Array | Reminders |
| lifePlannerHealthRoutines | Array | Health routines |
| lifePlannerDailyHealthPlans | Array | Daily health plans |
| lifePlannerDailyTasks | Object | Daily tasks by date |
| lifePlannerDiamondPeople | Array | Important people |
| lifePlannerProgress | Array | Progress tracking |
| **lifePlannerEvents** | **Array** | **📌 NEW: Calendar events** |
| **lifePlannerNotes** | **Array** | **📌 NEW: Notes** |
| **lifePlannerBudget** | **Object** | **📌 NEW: Budget tracking** |
| **lifePlannerCalendarEvents** | **Array** | **📌 NEW: Custom calendar events** |
| **lifePlannerPeriodPlans** | **Object** | **📌 NEW: Weekly/Monthly/Yearly plans** |
| **lifePlannerActionPlans** | **Array** | **📌 NEW: Action plans** |

---

## 🚀 Implementation Steps

1. **Open file:** `lib/db.ts`
2. **Find:** The User schema definition
3. **Locate:** The existing `lifePlanner*` fields
4. **Add:** The 6 new field definitions (copy from above)
5. **Save:** File
6. **Test:** Restart dev server, verify no errors
7. **Commit:** `git add lib/db.ts && git commit -m "Add missing lifePlanner schema fields"`

---

## ⚠️ Before Doing This

Make sure you:
1. ✅ Have MongoDB running locally
2. ✅ Have `.env` file with `MONGODB_URI`
3. ✅ Have no dev server running (stop with Ctrl+C)
4. ✅ Have git configured

---

## 🎉 After Schema Update

Once schema is updated:
1. ✅ Can create Events API
2. ✅ Can create Notes API
3. ✅ Can create Budget API
4. ✅ Can create Calendar Events API
5. ✅ Can create Period Plans API
6. ✅ Can create Action Plans API
7. ✅ All pages can auto-save to MongoDB
8. ✅ All data persists on refresh
9. ✅ All 39 users will have proper data isolation
