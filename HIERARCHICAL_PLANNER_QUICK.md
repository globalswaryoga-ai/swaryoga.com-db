# Hierarchical Life Planner - Quick Start Guide

## What Was Built?

A complete **hierarchical planning system** with:

```
Vision (10 Categories)
  └─ Goal (optional link to Vision)
      └─ Task (optional link to Goal)
          └─ Todo (optional link to Task)
  └─ Reminder (optional link to Vision)
```

All with **budgets**, **date ranges**, **priorities**, and **completion tracking**.

---

## Files Created

### Type Definition Updates
📄 `/lib/types/lifePlanner.ts`
- Added `VISION_CATEGORIES` with 10 heads
- Updated all interfaces with parent IDs, budgets, startDate

### New Components (4 files)

1. 📦 `/components/GoalManager.tsx` (400 lines)
   - Add/Edit/Delete goals
   - Link to parent vision
   - Budget & dates

2. 📦 `/components/TaskManager.tsx` (450 lines)
   - Add/Edit/Delete tasks
   - Link to parent goal
   - Completion checkboxes
   - Repeat options

3. 📦 `/components/TodoManager.tsx` (380 lines)
   - Add/Edit/Delete todos
   - Link to parent task
   - Completion checkboxes

4. 📦 `/components/ReminderManager.tsx` (500 lines)
   - Add/Edit/Delete reminders
   - Link to parent vision
   - Frequency options
   - Time scheduling

---

## Vision Categories (10 Heads)

```typescript
'Life'
'Health'
'Wealth'
'Success'
'Respect'
'Pleasure'
'Prosperity'
'Luxurious'
'Good Habits'
'Sadhana'
```

Select when creating a Vision.

---

## Quick Integration

### Step 1: Import Components

```typescript
import GoalManager from '@/components/GoalManager';
import TaskManager from '@/components/TaskManager';
import TodoManager from '@/components/TodoManager';
import ReminderManager from '@/components/ReminderManager';
```

### Step 2: Setup State

```typescript
const [goals, setGoals] = useState<Goal[]>([]);
const [tasks, setTasks] = useState<Task[]>([]);
const [todos, setTodos] = useState<Todo[]>([]);
const [reminders, setReminders] = useState<Reminder[]>([]);
```

### Step 3: Add to Page

```typescript
<GoalManager 
  goals={goals}
  visions={visions}
  onGoalAdd={(g) => setGoals([...goals, g])}
  onGoalDelete={(id) => setGoals(goals.filter(g => g.id !== id))}
/>
```

---

## Color Scheme

### Goal Manager (Emerald 🟢)
- Button: `bg-emerald-500`
- Edit: Blue
- Delete: Red

### Task Manager (Blue 🔵)
- Button: `bg-blue-500`
- Status badges colored

### Todo Manager (Purple 🟣)
- Button: `bg-purple-500`
- Priority badges colored

### Reminder Manager (Orange 🟠)
- Button: `bg-orange-500`
- Frequency badges: Daily=Blue, Weekly=Indigo, Monthly=Cyan, Yearly=Teal

---

## Form Fields

### Goal Form
```
Title (required)
Description
Linked Vision (optional dropdown)
Start Date
Target Date
Budget (optional)
Priority (Low/Medium/High)
Status (Not Started/In Progress/Completed/On Hold)
Progress (0-100% slider)
```

### Task Form
```
Title (required)
Description
Linked Goal (optional dropdown)
Start Date
Due Date
Budget (optional)
Priority (Low/Medium/High)
Status (Not Started/In Progress/Pending/Completed/Overdue)
Repeat (Once/Daily/Weekly/Monthly/Yearly)
Completed (checkbox)
```

### Todo Form
```
Title (required)
Description
Linked Task (optional dropdown)
Start Date
Due Date
Budget (optional)
Priority (Low/Medium/High)
Completed (checkbox)
```

### Reminder Form
```
Title (required)
Description
Linked Vision (optional dropdown)
Start Date
Due Date
Due Time (HH:MM)
Budget (optional)
Frequency (Once/Daily/Weekly/Monthly/Yearly)
Priority (Low/Medium/High)
Status (Active/Inactive)
Completed (checkbox)
```

---

## Key Features

✅ **Hierarchical**: Goals link to Visions, Tasks to Goals, Todos to Tasks, Reminders to Visions

✅ **Budget Tracking**: Optional budget fields for Goals, Tasks, Todos, Reminders

✅ **Date Ranges**: Start date + End/Target/Due date for all items

✅ **Priorities**: Low/Medium/High for all items

✅ **Status Tracking**: 
- Vision: Not Started/In Progress/Completed/On Hold
- Goal: Not Started/In Progress/Completed/On Hold
- Task: Not Started/In Progress/Pending/Completed/Overdue
- Todo: Binary (Completed or not)
- Reminder: Active/Inactive + Completed

✅ **Progress Tracking**: 0-100% slider for goals, visual progress bar

✅ **Completion Checkboxes**: Mark tasks, todos, reminders as done

✅ **Repeat Options**: Tasks support Once/Daily/Weekly/Monthly/Yearly

✅ **Time Scheduling**: Reminders can be set to specific times

✅ **Filtering**: Show items linked to specific parent (optional)

✅ **Responsive**: Mobile, tablet, and desktop layouts

✅ **Zero Errors**: All TypeScript strict mode compliant

---

## Usage Examples

### Create a Goal under Vision

```typescript
const newGoal: Goal = {
  id: '123',
  title: 'Lose 10kg',
  description: 'Health goal',
  visionId: selectedVision.id,  // Link to vision
  startDate: '2024-01-01',
  targetDate: '2024-06-01',
  budget: 500,  // Gym membership cost
  priority: 'high',
  status: 'in-progress',
  progress: 30,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### Create a Task under Goal

```typescript
const newTask: Task = {
  id: '456',
  title: 'Join gym',
  description: 'Register at local gym',
  goalId: selectedGoal.id,  // Link to goal
  startDate: '2024-01-05',
  dueDate: '2024-01-10',
  budget: 100,  // Registration fee
  priority: 'high',
  status: 'completed',
  repeat: 'once',
  completed: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### Create a Todo under Task

```typescript
const newTodo: Todo = {
  id: '789',
  title: 'Call gym to confirm',
  taskId: selectedTask.id,  // Link to task
  startDate: '2024-01-05',
  dueDate: '2024-01-06',
  priority: 'medium',
  completed: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### Create a Reminder under Vision

```typescript
const newReminder: Reminder = {
  id: '999',
  title: 'Drink water',
  visionId: selectedVision.id,  // Link to vision
  startDate: '2024-01-01',
  dueDate: '2024-12-31',
  dueTime: '11:00',
  budget: 0,
  frequency: 'daily',
  priority: 'medium',
  active: true,
  completed: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

---

## Status Verification

### Compilation
✅ All files compile with 0 TypeScript errors

### Files Created
- ✅ GoalManager.tsx
- ✅ TaskManager.tsx
- ✅ TodoManager.tsx
- ✅ ReminderManager.tsx
- ✅ Type definitions updated

### Testing
Run in your dashboard:
```bash
npm run dev
# Navigate to Life Planner section
# Test add/edit/delete for each manager
```

---

## Visual Hierarchy

```
┌─────────────────────────────────────┐
│         VISION (10 Categories)      │
│  Life, Health, Wealth, etc.         │
│  ├─ Status: Not Started...Completed │
│  ├─ Priority: Low/Medium/High       │
│  └─ Progress: 0-100%                │
└─────────────────────────────────────┘
         │                │
         ▼                ▼
   ┌──────────┐    ┌──────────────────┐
   │  GOALs   │    │   REMINDERs      │
   │ (linked) │    │ (linked to Vision)
   └──────────┘    └──────────────────┘
         │
         ▼
   ┌──────────┐
   │  TASKs   │
   │ (linked) │
   └──────────┘
         │
         ▼
   ┌──────────┐
   │  TODOs   │
   │ (linked) │
   └──────────┘
```

---

## Sample Data Structure

```typescript
{
  visions: [
    {
      id: 'v1',
      title: 'Be Healthy',
      category: 'Health',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      status: 'in-progress',
      progress: 45,
      goals: [{ id: 'g1', ... }],
      reminders: [{ id: 'r1', ... }],
      ...
    }
  ],
  goals: [
    {
      id: 'g1',
      title: 'Run 5k daily',
      visionId: 'v1',
      startDate: '2024-01-01',
      targetDate: '2024-12-31',
      budget: 500,
      priority: 'high',
      progress: 60,
      ...
    }
  ],
  tasks: [
    {
      id: 't1',
      title: 'Buy running shoes',
      goalId: 'g1',
      startDate: '2024-01-01',
      dueDate: '2024-01-10',
      budget: 150,
      status: 'completed',
      ...
    }
  ],
  todos: [
    {
      id: 'td1',
      title: 'Visit Nike store',
      taskId: 't1',
      startDate: '2024-01-05',
      dueDate: '2024-01-10',
      completed: true,
      ...
    }
  ],
  reminders: [
    {
      id: 'rm1',
      title: 'Morning jog',
      visionId: 'v1',
      startDate: '2024-01-01',
      dueDate: '2025-12-31',
      dueTime: '06:00',
      frequency: 'daily',
      active: true,
      ...
    }
  ]
}
```

---

## Next: localStorage Integration

```typescript
// Save
localStorage.setItem('lifeplannerData', JSON.stringify({
  visions, goals, tasks, todos, reminders
}));

// Load
const saved = JSON.parse(localStorage.getItem('lifeplannerData') || '{}');
setVisions(saved.visions || []);
setGoals(saved.goals || []);
// ... etc
```

---

## Next: Database Integration

Replace localStorage with Supabase:

```typescript
// Save to DB
const { error } = await supabase
  .from('goals')
  .insert(newGoal);

// Load from DB
const { data } = await supabase
  .from('goals')
  .select('*');
```

---

## Troubleshooting

**Q: Forms not showing?**
A: Call `setShowForm(true)` on button click

**Q: Items not saving?**
A: Implement `onGoalAdd`, `onTaskAdd` callbacks

**Q: Can't see child items?**
A: Pass `selectedVisionId` or `selectedGoalId` to filter

**Q: Budget not showing?**
A: Budget is optional - add a number > 0

---

## Summary

You now have a **complete hierarchical planning system** with:

✅ Visions with 10 category heads  
✅ Goals linked to Visions (optional)  
✅ Tasks linked to Goals (optional)  
✅ Todos linked to Tasks (optional)  
✅ Reminders linked to Visions (optional)  
✅ Budget tracking throughout  
✅ Date ranges for all items  
✅ Priority and status tracking  
✅ Completion checkboxes  
✅ Responsive design  
✅ Zero TypeScript errors  
✅ Production-ready code  

**Ready to integrate into your Life Planner dashboard!**

