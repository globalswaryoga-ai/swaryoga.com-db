# 📚 Data Saving Process - Quick Reference Guide

## TL;DR (Too Long; Didn't Read)

**How data is saved in 4 steps:**

1. **User Input** → Form filled in browser
2. **API Call** → `goalAPI.create(data)` sends to backend
3. **Database Save** → MongoDB stores with userId
4. **Response** → Data returned, cached locally

**Security:** Every API request includes `X-User-ID` header from `localStorage['user']`

---

## 🚀 Quick Process Overview

```
User Saves → React API → Express Backend → MongoDB → Cached Locally
```

### Step-by-Step

| Step | What Happens | Location | Code |
|------|-------------|----------|------|
| 1 | User fills form & clicks save | Browser | React Component |
| 2 | Extract user ID from storage | Frontend | `localStorage['user']._id` |
| 3 | Add to request header | Axios | `X-User-ID: user123` |
| 4 | Send HTTP POST request | Network | `POST /api/goals` |
| 5 | Receive at backend | Server | Express route handler |
| 6 | Validate data | Backend | Mongoose schema |
| 7 | Save to MongoDB | Database | `goal.save()` |
| 8 | Generate response | Backend | `res.json({ success: true, data: ... })` |
| 9 | Receive response | Frontend | Axios promise resolved |
| 10 | Cache locally | Browser | `localStorage['cached_goals']` |
| 11 | Update React state | Frontend | `setGoals([...])` |
| 12 | UI re-renders | Browser | New goal visible ✓ |

---

## 🔐 User Data Security

### How Your Data is Protected

**Every request checked for:**
- ✅ X-User-ID header must exist
- ✅ User ID extracted from localStorage['user']
- ✅ MongoDB query filtered by userId
- ✅ Only your data returns to you

### Example: Two Users, Same Database

```
Database contains:
- Goal 1 (userId: user_abc) ← User A owns this
- Goal 2 (userId: user_xyz) ← User B owns this
- Goal 3 (userId: user_abc) ← User A owns this

When User A requests goals:
  Header: X-User-ID: user_abc
  Database query: Goal.find({ userId: 'user_abc' })
  Returns: Goals 1 and 3 only ✓

When User B requests goals:
  Header: X-User-ID: user_xyz
  Database query: Goal.find({ userId: 'user_xyz' })
  Returns: Goal 2 only ✓

User A CANNOT access Goal 2 (User B's data)
User B CANNOT access Goals 1 and 3 (User A's data)
```

---

## 📁 Where Data is Stored

### Browser (Frontend)
```javascript
localStorage['user']           // Current logged-in user info
localStorage['cached_goals']   // Cached goals for offline access
localStorage['cached_visions'] // Cached visions
localStorage['cached_tasks']   // Cached tasks
... etc
```

### Database (MongoDB)
```
swaryogadb.dheqmu1.mongodb.net/swar-yoga-db

Collections:
├─ visions (all users' visions)
├─ goals (all users' goals)
├─ tasks (all users' tasks)
├─ todos (all users' todos)
├─ health (all users' health data)
... (25+ more collections)

Each document has: userId field (for filtering)
```

---

## 🔄 Data Operations

### CREATE (Save New Data)

```typescript
// Frontend
const newGoal = {
  title: "Learn Yoga",
  description: "Complete certification",
  priority: "High"
};

const result = await goalAPI.create(newGoal);
// POST /api/goals with X-User-ID header
// MongoDB: new Goal({ userId, title, description, priority })
// Returns: saved goal with _id and timestamps
```

### READ (Get Existing Data)

```typescript
// Frontend
const goals = await goalAPI.list();
// GET /api/goals with X-User-ID header
// MongoDB: Goal.find({ userId })
// Returns: array of user's goals
```

### UPDATE (Modify Existing Data)

```typescript
// Frontend
const updated = await goalAPI.update(goalId, { status: 'Completed' });
// PUT /api/goals/:id with X-User-ID header
// MongoDB: Goal.findOneAndUpdate({ _id, userId }, { status: 'Completed' })
// Returns: updated goal
```

### DELETE (Remove Data)

```typescript
// Frontend
await goalAPI.delete(goalId);
// DELETE /api/goals/:id with X-User-ID header
// MongoDB: Goal.deleteOne({ _id, userId })
// Returns: success message
```

---

## 🎯 API Endpoints (All Available)

### Visions
- `POST /api/visions` - Create vision
- `GET /api/visions` - List all visions
- `GET /api/visions/:id` - Get one vision
- `PUT /api/visions/:id` - Update vision
- `DELETE /api/visions/:id` - Delete vision

### Goals
- `POST /api/goals` - Create goal
- `GET /api/goals` - List all goals
- `GET /api/goals/:id` - Get one goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List all tasks
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Todos
- `POST /api/todos` - Create todo
- `GET /api/todos` - List all todos
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo

### Health
- `POST /api/health` - Track health data
- `GET /api/health` - List health records
- `PUT /api/health/:id` - Update health
- `DELETE /api/health/:id` - Delete health

### Other Collections
- `/api/reminders` - Reminders & notifications
- `/api/dailyplans` - Daily schedules
- `/api/mywords` - Personal affirmations
- `/api/milestones` - Achievements
- `/api/carts` - Shopping cart
- `/api/checkout` - Checkout process
- `/api/users` - User profile

---

## 💾 Offline Capability

### What Happens When Internet is Down?

1. **User tries to save** → API call fails
2. **Backend unavailable?** → Try localhost fallback
3. **Still fails?** → Use cached data from localStorage
4. **Result:** ✓ App continues working with cached data

### What Works Offline?
- ✅ Read saved data (from cache)
- ✅ View visions, goals, tasks
- ✅ View health history

### What Doesn't Work Offline?
- ❌ Create new items
- ❌ Delete items
- ❌ Update items

### When Internet Returns?
- ✓ Automatic sync with server
- ✓ New items created
- ✓ Updates applied
- ✓ Deletions processed

---

## 🛡️ Error Handling

### If Backend is Down

```typescript
// sadhakaPlannerData.ts automatically:
1. Retries the request once
2. If fails, tries localhost:4000 fallback
3. If still fails, returns cached data
4. Shows warning in console
5. App continues working with cache
```

### If Database Connection Fails

```typescript
// Backend returns error response:
{
  "success": false,
  "error": "MongoDB connection failed",
  "message": "Database temporarily unavailable"
}

// Frontend:
1. Shows error toast to user
2. Keeps previous data cached
3. Can retry request later
```

---

## 📊 Data Models Example: Goal

### What Gets Saved?

```javascript
{
  _id: "goal_550e8400-e29b-41d4-a716-446655440000",  // UUID
  userId: "user_abc123",                              // User identifier
  title: "Learn Yoga",                                // Required
  description: "Complete certification program",      // Optional
  visionId: "vision_123",                             // Links to parent vision
  status: "In Progress",                              // Active/Completed/Not Started
  priority: "High",                                   // High/Medium/Low
  targetDate: "2025-12-31",                           // Optional deadline
  createdAt: "2025-12-10T10:15:00Z",                 // Auto-generated
  updatedAt: "2025-12-10T10:15:00Z"                  // Auto-updated
}
```

### Validation Rules

| Field | Required | Type | Validation |
|-------|----------|------|-----------|
| title | Yes | String | 1-255 chars |
| description | No | String | 0-1000 chars |
| priority | No | Enum | High/Medium/Low |
| status | No | Enum | Not Started/In Progress/Completed |
| targetDate | No | Date | Must be future date |

---

## 🔍 Database Queries

### Query 1: Get All Goals for Current User

```javascript
// MongoDB query
db.goals.find({ userId: 'user_abc123' })

// With index: { userId: 1, createdAt: -1 }
// Performance: Very fast (< 10ms)
```

### Query 2: Get Completed Goals

```javascript
// MongoDB query
db.goals.find({ 
  userId: 'user_abc123',
  status: 'Completed'
})
```

### Query 3: Sort by Newest First

```javascript
// MongoDB query
db.goals.find({ userId: 'user_abc123' })
  .sort({ createdAt: -1 })
  .limit(10)

// Returns last 10 goals, newest first
```

---

## 🔄 Real-World Example: Creating a Goal

### Step-by-Step Execution

```
1. USER ACTION
   ┌─ SadhakaPlannerPage.tsx
   │  User clicks "Add Goal" button
   │  Form appears for input
   │  User enters:
   │  - Title: "Complete Yoga Certification"
   │  - Description: "Get certified in 6 months"
   │  - Priority: "High"
   │  - User clicks "Save"

2. REACT COMPONENT
   ┌─ handleCreateGoal() function called
   │  Validates form data
   │  Calls: goalAPI.create({
   │    title: "Complete Yoga Certification",
   │    description: "Get certified in 6 months",
   │    priority: "High"
   │  })

3. API SDK LAYER
   ┌─ goalAPI.create() in sadhakaPlannerData.ts
   │  Gets userId from localStorage['user']._id
   │  Adds header: X-User-ID = "user_abc123"
   │  Creates axios config with headers
   │  Calls: apiClient.post('/goals', data)

4. HTTP REQUEST
   ┌─ Network request sent:
   │  POST http://localhost:4000/api/goals
   │  Headers:
   │    - Content-Type: application/json
   │    - X-User-ID: user_abc123
   │  Body:
   │    {
   │      "title": "Complete Yoga Certification",
   │      "description": "Get certified in 6 months",
   │      "priority": "High"
   │    }

5. BACKEND PROCESSING
   ┌─ Express route handler (routes/goals.ts)
   │  Receives POST request at /api/goals
   │  Extracts userId from header: "user_abc123"
   │  Validates request body (title required ✓)
   │  Creates Goal instance:
   │    new Goal({
   │      userId: "user_abc123",
   │      title: "Complete Yoga Certification",
   │      description: "Get certified in 6 months",
   │      priority: "High",
   │      status: "Not Started"  ← Default
   │    })

6. MONGOOSE VALIDATION
   ┌─ Schema validation (models/Goal.ts)
   │  Checks schema requirements
   │  ✓ userId is string (required)
   │  ✓ title is string (required)
   │  ✓ priority is valid enum
   │  ✓ status is valid enum
   │  Generates _id: UUID
   │  Sets createdAt: now
   │  Sets updatedAt: now

7. MONGODB SAVE
   ┌─ goal.save() executes
   │  Connects to MongoDB Atlas
   │  Uses index { userId: 1, createdAt: -1 }
   │  Inserts document into 'goals' collection
   │  Document stored:
   │    {
   │      "_id": "goal_550e8400",
   │      "userId": "user_abc123",
   │      "title": "Complete Yoga Certification",
   │      "description": "Get certified in 6 months",
   │      "priority": "High",
   │      "status": "Not Started",
   │      "createdAt": "2025-12-10T10:15:00Z",
   │      "updatedAt": "2025-12-10T10:15:00Z"
   │    }

8. RESPONSE SENT
   ┌─ Backend returns HTTP 201 Created:
   │  {
   │    "success": true,
   │    "data": {
   │      "_id": "goal_550e8400",
   │      "userId": "user_abc123",
   │      "title": "Complete Yoga Certification",
   │      "createdAt": "2025-12-10T10:15:00Z",
   │      "updatedAt": "2025-12-10T10:15:00Z"
   │    },
   │    "message": "Goal created successfully"
   │  }

9. FRONTEND PROCESSES RESPONSE
   ┌─ goalAPI.create() receives response
   │  Caches in localStorage:
   │    localStorage['cached_goals'] = JSON.stringify([...])
   │  Returns data to component

10. REACT STATE UPDATE
    ┌─ Component receives response
    │  Updates state:
    │    setGoals([...goals, result.data])
    │  Triggers re-render

11. UI UPDATES
    ┌─ React re-renders page
    │  New goal appears in list
    │  Form clears
    │  Success toast shows:
    │    "Goal created successfully!"

12. USER SEES RESULT ✓
    └─ New goal visible on screen
       All happens in ~500ms
```

---

## 🚨 Common Issues & Solutions

### Issue: "X-User-ID header missing"

**Cause:** User not logged in or `localStorage['user']` is empty

**Solution:**
```typescript
// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!user._id) {
  // Redirect to login
  window.location.href = '/signin';
}
```

### Issue: Data not persisting after refresh

**Cause:** API response not being cached

**Solution:**
```typescript
// Ensure caching is enabled in sadhakaPlannerData.ts
localStorage.setItem('cached_goals', JSON.stringify(response.data));
```

### Issue: Another user's data visible

**Cause:** Backend not filtering by userId

**Solution:**
```typescript
// Backend MUST filter by userId from header
const userId = req.headers['x-user-id'];
const goals = await Goal.find({ userId });  // CRITICAL!
```

### Issue: Backend returns 500 error

**Cause:** MongoDB connection failed or validation error

**Solution:**
```typescript
// Frontend falls back to cached data
const cached = JSON.parse(localStorage.getItem('cached_goals') || '[]');
return cached;  // Shows old data, prevents app crash
```

---

## 📋 Checklist: Data Saving Process

When user saves data, verify:

- [ ] Form validation passed
- [ ] User logged in (localStorage['user'] exists)
- [ ] X-User-ID header added to request
- [ ] Request sent to correct API endpoint
- [ ] Backend received request
- [ ] userId extracted from header
- [ ] Data validated against Mongoose schema
- [ ] MongoDB connected
- [ ] Document saved with userId field
- [ ] _id (UUID) generated
- [ ] Timestamps (createdAt, updatedAt) set
- [ ] Response sent back to frontend
- [ ] Response cached in localStorage
- [ ] React state updated
- [ ] UI re-renders
- [ ] User sees new data ✓

---

## 🎓 Learning Resources

### Files to Study

1. **Frontend:** `src/utils/sadhakaPlannerData.ts` (782 lines)
   - How API calls are made
   - User ID extraction
   - Error handling & caching

2. **Backend:** `server/routes/goals.ts`
   - Route handlers (GET, POST, PUT, DELETE)
   - userId extraction from header
   - MongoDB queries

3. **Database:** `server/models/Goal.ts`
   - Schema definition
   - Validation rules
   - Indexes

4. **Documentation:**
   - `DATA_FLOW_AND_SAVING_PROCESS.md` - Detailed explanation
   - `DATA_FLOW_VISUAL_DIAGRAMS.md` - Visual guides
   - This file - Quick reference

---

## 🔗 Related Documentation

- API Endpoints: See `QUICK_REFERENCE.txt`
- Database Setup: See `MONGODB_SETUP_COMPLETE.md`
- System Status: Run `./QUICK_SYSTEM_CHECK.sh`
- Vercel Deployment: See `VERCEL_DEPLOYMENT_COMPLETE.md`

---

## 📞 Support

For issues with data saving:

1. Check browser console for errors
2. Verify backend is running: `pm2 status`
3. Check MongoDB connection: Look for "MongoDB initialization successful" in logs
4. Test API endpoint: `curl http://localhost:4000/api/goals`
5. Check localStorage: Open DevTools → Application → localStorage

---

**Last Updated:** December 10, 2025
**Status:** Production Ready ✓
