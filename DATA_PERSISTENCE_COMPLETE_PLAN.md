# 📋 Life Planner - Complete Data Persistence Plan

## 🎯 Goal
**When ANY user adds ANY data ANYWHERE in the app, it MUST be saved permanently to MongoDB - not lost on refresh or browser close!**

---

## 📊 Current Data Persistence Status

### ✅ ALREADY IMPLEMENTED (Auto-saving to MongoDB)
1. **Daily Page** - Workshop tasks & Sadhana
   - API: `/api/life-planner/daily-tasks`
   - Fields: `workshopTasks`, `sadhana`
   - Auto-save: 500ms debounce
   - Status: ✅ WORKING

2. **Vision/Goals/Tasks/Todos** - Already using MongoDB-backed API
   - API: `/api/life-planner/data`
   - Status: ✅ WORKING (Visions, Goals, Tasks stored in User model arrays)

3. **Health Routines**
   - API: `/api/life-planner/data?type=healthRoutines`
   - Status: ✅ WORKING (Using existing storage layer)

---

### ⚠️ NEEDS IMPLEMENTATION (Currently localStorage only)

| Page | Data Type | Storage | Issue | Priority |
|------|-----------|---------|-------|----------|
| **Events** | Event list | localStorage | Lost on refresh | 🔴 HIGH |
| **Todos** | Todo items | localStorage | Lost on refresh | 🔴 HIGH |
| **Notes** | Notes content | localStorage | Lost on refresh | 🔴 HIGH |
| **Diamond People** | People list | localStorage | Lost on refresh | 🔴 HIGH |
| **Budget** | Budget entries | localStorage | Lost on refresh | 🔴 HIGH |
| **Reminders** | Reminders | localStorage | Lost on refresh | 🔴 HIGH |
| **Calendar** | Custom events | localStorage | Lost on refresh | 🟡 MEDIUM |
| **Weekly/Monthly/Yearly** | Plans | localStorage | Lost on refresh | 🟡 MEDIUM |
| **Action Plans** | Plans | localStorage | Lost on refresh | 🟡 MEDIUM |
| **Routines** | Routine data | localStorage | Lost on refresh | 🟡 MEDIUM |

---

## 🛠️ Implementation Pattern

### Step 1: Define API Endpoint
Create a new endpoint for each data type:

```typescript
// app/api/life-planner/[dataType]/route.ts
// GET: Fetch user's data
// POST: Save/Update user's data
```

### Step 2: Add Storage Layer Method
Add to `lib/lifePlannerMongoStorage.ts`:

```typescript
async getEvents(): Promise<Event[]>
async saveEvents(events: Event[]): Promise<void>

async getTodos(): Promise<Todo[]>
async saveTodos(todos: Todo[]): Promise<void>

// etc for each data type
```

### Step 3: Update Component
In each page component:

```typescript
// On initial load
useEffect(() => {
  const loaded = lifePlannerStorage.get[DataType](); // Try MongoDB first
  if (loaded) setData(loaded);
  else {
    const legacy = localStorage.getItem(key); // Fallback to localStorage
    if (legacy) setData(JSON.parse(legacy));
  }
}, []);

// On data change (debounced)
useEffect(() => {
  const timer = setTimeout(() => {
    lifePlannerStorage.save[DataType](data); // Auto-save to MongoDB
  }, 500);
  return () => clearTimeout(timer);
}, [data]);
```

---

## 📋 Detailed Action Plan

### 🎯 Phase 1: Critical Pages (This Week)

#### 1. Events Page
- **File:** `app/life-planner/dashboard/events/page.tsx`
- **Data:** PlannerEvent array
- **Action:**
  - Create endpoint: `/api/life-planner/events`
  - Add methods: `getEvents()`, `saveEvents(events)`
  - Add auto-save to component
  - Add MongoDB load on mount

#### 2. Todos Page
- **File:** `app/life-planner/dashboard/todos/page.tsx`
- **Data:** Todo array
- **Action:**
  - Create endpoint: `/api/life-planner/todos`
  - Add methods: `getTodos()`, `saveTodos(todos)`
  - Add auto-save to component
  - Add MongoDB load on mount

#### 3. Notes Page
- **File:** `app/life-planner/dashboard/notes/page.tsx`
- **Data:** Note array
- **Action:**
  - Create endpoint: `/api/life-planner/notes`
  - Add methods: `getNotes()`, `saveNotes(notes)`
  - Add auto-save to component
  - Add MongoDB load on mount

#### 4. Diamond People Page
- **File:** `app/life-planner/dashboard/diamond-people/page.tsx`
- **Data:** DiamondPerson array
- **Action:**
  - Create endpoint: `/api/life-planner/diamond-people`
  - Add methods: `getDiamondPeople()`, `saveDiamondPeople(people)`
  - Add auto-save to component
  - Add MongoDB load on mount

#### 5. Reminders Page
- **File:** `app/life-planner/dashboard/reminders/page.tsx`
- **Data:** Reminder array
- **Action:**
  - Create endpoint: `/api/life-planner/reminders`
  - Add methods: `getReminders()`, `saveReminders(reminders)`
  - Add auto-save to component
  - Add MongoDB load on mount

#### 6. Budget Page
- **File:** `app/life-planner/dashboard/budget/page.tsx`
- **Data:** Budget entries
- **Action:**
  - Create endpoint: `/api/life-planner/budget`
  - Add methods: `getBudget()`, `saveBudget(budget)`
  - Add auto-save to component
  - Add MongoDB load on mount

### 🎯 Phase 2: Secondary Pages (Next Week)

#### 7. Calendar Custom Events
- **File:** `app/life-planner/dashboard/calendar/calendar-new.tsx`
- **Data:** customEvents array
- **Action:**
  - Create endpoint: `/api/life-planner/calendar-events`
  - Add methods: `getCalendarEvents()`, `saveCalendarEvents(events)`
  - Add auto-save to component

#### 8. Weekly/Monthly/Yearly Planner
- **Files:** `weekly/page.tsx`, `monthly/page.tsx`, `yearly/page.tsx`
- **Data:** Plan data per week/month/year
- **Action:**
  - Create endpoint: `/api/life-planner/period-plans`
  - Add methods: `getPeriodPlans(period)`, `savePeriodPlans(period, plans)`

#### 9. Action Plans
- **File:** `app/life-planner/dashboard/action-plan/page.tsx`
- **Data:** ActionPlan array
- **Action:**
  - Create endpoint: `/api/life-planner/action-plans`
  - Add methods: `getActionPlans()`, `saveActionPlans(plans)`

---

## 📝 Schema Changes Needed

Update `lib/db.ts` User schema to add missing fields:

```typescript
// Add to User schema:
lifePlannerEvents: [mongoose.Schema.Types.Mixed],
lifePlannerNotes: [mongoose.Schema.Types.Mixed],
lifePlannerBudget: mongoose.Schema.Types.Mixed,
lifePlannerReminders: [mongoose.Schema.Types.Mixed],
lifePlannerCalendarEvents: [mongoose.Schema.Types.Mixed],
lifePlannerPeriodPlans: mongoose.Schema.Types.Mixed, // weekly/monthly/yearly
lifePlannerActionPlans: [mongoose.Schema.Types.Mixed],
```

---

## 🔄 Data Flow Pattern (Apply to All Pages)

```
User adds/edits data in UI
         ↓
State updates immediately (setData)
         ↓
Save to localStorage instantly (fast UI response)
         ↓
500ms debounce timer starts
         ↓
Timer expires → Call lifePlannerStorage.save[Type](data)
         ↓
API POST to /api/life-planner/[type]
         ↓
MongoDB saves to User.lifePlanner[Type]
         ↓
USER REFRESHES PAGE
         ↓
useEffect loads from MongoDB first
         ↓
If available: Use MongoDB data
If not available: Fallback to localStorage
         ↓
UI displays persisted data ✅
```

---

## ✅ Verification Checklist

For each page, verify:

- [ ] API endpoint created (`/api/life-planner/[type]`)
- [ ] Storage method added to `lifePlannerMongoStorage.ts`
- [ ] Initial load fetches from MongoDB (with localStorage fallback)
- [ ] Auto-save on data change (500ms debounce)
- [ ] Schema field added to User model
- [ ] Test: Add data → Refresh → Data persists
- [ ] Test: Close browser → Reopen → Data restored
- [ ] Data isolation verified (User A can't see User B's data)

---

## 🎉 End Result

When complete:

✅ **Users add data → Data is ALWAYS saved permanently**
✅ **Page refresh → Data is ALWAYS restored from MongoDB**
✅ **Browser close/reopen → Data is ALWAYS there**
✅ **Each user sees only their own data**
✅ **Zero data loss for any user**

---

## 📅 Timeline

- **Week 1:** Phase 1 (Events, Todos, Notes, Diamond People, Reminders, Budget)
- **Week 2:** Phase 2 (Calendar, Weekly/Monthly/Yearly, Action Plans)
- **Week 3:** Testing and verification across all pages

---

## 🚀 Quick Implementation Summary

Each page follows the same 3-step pattern:

1. **Create API**: `/api/life-planner/[dataType]/route.ts`
2. **Add Storage Method**: `lifePlannerMongoStorage.ts`
3. **Update Component**: 
   - Load from MongoDB on mount
   - Auto-save on change
   - Keep localStorage fallback

That's it! Repeat for all 10+ pages and you have 100% data persistence! 🎉
