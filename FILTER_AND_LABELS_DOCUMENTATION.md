# Filter & Labels System - Complete Documentation

## Overview
The Leads Followup system has two main features:
1. **Three Filter Dropdowns** - Search and select across Admin Users, Workshops, and Leads
2. **Labels Function** - Organize and tag leads with custom labels

---

## 1. FILTER DROPDOWNS SYSTEM

### Three Search Filters Available

#### 🟦 **Filter 1: Select Admin User** (Blue)
- **Purpose:** Filter or select specific admin users who manage leads
- **Hardcoded Admin Users:**
  - admincrm
  - Turya Kalburgi
  - Aditya Yadav
  - Shekhar Suman
  - Navneet Kumar
  - Varun

- **Options:**
  - ✅ **All Admin Users** (NEW!) - Shows all admin users at once
  - Individual admin user names

- **How to Use:**
  ```
  1. Click "Select Admin User" button
  2. Search dropdown opens below the button
  3. Type "all" or leave blank to see "✅ All Admin Users" option
  4. Click on any option to select
  ```

---

#### 🟧 **Filter 2: Select Workshop** (Orange)
- **Purpose:** Filter or select workshops from the database
- **Dynamic Options:**
  - Workshops are fetched from the database (workshopName field)
  - Automatically updated as new workshops are added

- **Options:**
  - ✅ **All Workshops** (NEW!) - Shows all workshops
  - Individual workshop names (sorted alphabetically)

- **How to Use:**
  ```
  1. Click "Select Workshop" button
  2. Search dropdown opens
  3. Type "all" or leave blank to see "✅ All Workshops" option
  4. Type workshop name to search
  5. Click to select
  ```

---

#### ⬛ **Filter 3: Select Leads** (Dark/Black)
- **Purpose:** Search and select individual leads
- **Options:**
  - ✅ **All Leads** (NEW!) - Shows all leads in the system
  - Individual leads filtered by:
    - Lead name
    - Phone number
    - Email
    - Lead ID

- **How to Use:**
  ```
  1. Click "Select Leads" button
  2. Search dropdown opens
  3. Type "all" to see "✅ All Leads" option
  4. Search by name, phone, email, or ID
  5. Click lead to select
  ```

---

### Filter Dropdown Features

**Search Functionality:**
- Real-time filtering as you type
- Case-insensitive search
- Displays relevant fields based on filter type
  - **Admin Users:** Shows admin name only
  - **Workshops:** Shows workshop name
  - **Leads:** Shows name + phone + email

**Display Format:**
```
┌─────────────────────────────────┐
│ 🔍 Search Input (placeholder)   │
├─────────────────────────────────┤
│ ✅ All [Type]  (appears when    │
│                 searching "all")  │
│ Option 1                        │
│ Option 2                        │
│ Option 3                        │
│ ... (scrollable, max 72px)      │
└─────────────────────────────────┘
```

**Dropdown Behavior:**
- Scrollable if results exceed ~4 items
- Maximum height: 288px
- Appears below the button
- Auto-closes when item selected
- Clears search after selection

---

## 2. LABELS FUNCTION

### What are Labels?

Labels are **custom tags** you assign to leads for organization and categorization. They help you:
- Group leads by characteristics (VIP, Hot Lead, Follow-up Required, etc.)
- Track lead status or stage
- Create meaningful categories for bulk actions
- Organize leads for team collaboration

---

### How Labels Work

#### **Step 1: Access Labels Section**
```
Left Sidebar → Action Modes:
📝 Notes | 💬 WhatsApp | 📧 Email | 📱 SMS | ✅ Todos | 🔔 Reminder | 📅 Next Followup | 🏷️ Labels
                                                                                             ↑
Click here to open Labels panel
```

#### **Step 2: Add New Label**
```
Panel shows:
┌──────────────────────────────────────┐
│ Add New Label                        │
├──────────────────────────────────────┤
│ [Input Field] | [Add Button]         │
│ "Enter label name..."                │
└──────────────────────────────────────┘

Actions:
- Type label name in input field
- Press ENTER or click [Add] button
- Label is immediately added to selected labels
```

#### **Step 3: View Selected Labels**
```
Selected Labels section shows:
┌──────────────────────────────────────┐
│ Selected Labels                      │
├──────────────────────────────────────┤
│ [Label 1] ×  [Label 2] ×  [Label 3] × │
│ (Indigo color with × button)         │
└──────────────────────────────────────┘

Features:
- Each label appears as a pill/tag
- Indigo background color (bg-indigo-100, text-indigo-700)
- Click × button to remove that label
```

#### **Step 4: Save Labels to Lead**
```
After adding labels:
1. Click [Save] button in the Actions section
2. Labels are saved to the selected lead in database
3. Success message appears (optional)
4. Labels persist until manually changed
```

---

### Label Data Structure

**In Database (MongoDB):**
```javascript
Lead {
  _id: ObjectId,
  name: String,
  phoneNumber: String,
  email: String,
  labels: [String],  // Array of label strings
  // ... other fields
}
```

**In Component State:**
```typescript
const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
// Example: ['VIP', 'Follow-up Required', 'Interested']
```

---

### Label Examples

**Suggested Labels for Yoga Business:**
- VIP (high-value customers)
- Hot Lead (immediate interest)
- Cold Lead (low interest)
- Interested in Workshop
- Interested in Course
- Interested in Retreat
- Follow-up Required
- Pending Payment
- Newsletter Subscriber
- Referred Client
- Corporate Group
- Student
- Beginner
- Advanced

---

### Key Label Features

| Feature | Description |
|---------|-------------|
| **Add Multiple** | Add as many labels as needed to a single lead |
| **Remove Easily** | Click × button to remove individual labels |
| **Clear All** | Remove all labels by clicking × on each |
| **Save to DB** | Click [Save] button to persist changes |
| **Display in Header** | Shows "2 label(s)" and list preview in header |
| **No Duplicates** | Same label can be added, appears multiple times (if needed) |
| **Search Support** | Can filter leads by label (in other parts of system) |

---

### Label Workflow Example

```
Step 1: Select a Lead
  ↓
Step 2: Click "🏷️ Labels" action mode
  ↓
Step 3: Type "VIP" in input field
  ↓
Step 4: Press ENTER or click [Add]
  ↓
Step 5: See "✅ VIP ×" pill appear
  ↓
Step 6: Add more labels if needed (e.g., "Hot Lead", "Follow-up Required")
  ↓
Step 7: Click [Save] button
  ↓
Step 8: Labels are now associated with the lead
```

---

## 3. COMPLETE FILTER + LABELS WORKFLOW

### Typical Use Case: Managing a Workshop's Leads

```
1. FILTER BY WORKSHOP
   └─ Click "🏫 Select Workshop"
   └─ Search: "Yoga Basics"
   └─ Select "Yoga Basics" workshop
   └─ View all leads interested in Yoga Basics

2. FILTER BY STATUS/ADMIN
   └─ Click "👨‍💼 Select Admin User"
   └─ Select "Turya Kalburgi" (responsible admin)
   └─ Shows leads managed by Turya for Yoga Basics

3. SELECT A LEAD
   └─ Click on a lead from the list
   └─ Lead details appear on right panel

4. ADD LABELS
   └─ Click "🏷️ Labels"
   └─ Add: "Interested", "Follow-up Required", "VIP"
   └─ Click [Save]

5. TRACK IN NOTES/WHATSAPP
   └─ Click "📝 Notes" to add follow-up details
   └─ Click "💬 WhatsApp" to send message
```

---

## 4. FILTER LOGIC & IMPLEMENTATION

### Filter Type: "lead"
```typescript
// Shows all leads from database
// Searches across: name, phone, email, ID
// Special: Type "all" to show "✅ All Leads" option

Example:
  Search: "9876" → Shows leads with phone containing 9876
  Search: "John" → Shows leads named John
  Search: "all" → Shows "✅ All Leads" option + all matching leads
```

### Filter Type: "workshop"
```typescript
// Gets unique workshop names from leads
// Creates mock lead objects for display
// workshopName field = "ALL" when "All Workshops" selected

Example:
  No search: Shows "✅ All Workshops" + all workshop names
  Search: "Yoga" → Shows workshops containing "Yoga"
  Search: "all" → Shows "✅ All Workshops" option
```

### Filter Type: "admin"
```typescript
// Uses hardcoded ADMIN_USERS array
// Creates mock lead objects for display
// Name field contains admin name

Example:
  No search: Shows "✅ All Admin Users" + all admin names
  Search: "Turya" → Shows "Turya Kalburgi"
  Search: "all" → Shows "✅ All Admin Users" option
```

---

## 5. API INTEGRATION POINTS

### When Labels are Saved

**Endpoint:** `POST /api/admin/crm/leads/[leadId]`

```javascript
// Payload sent to API
{
  actionMode: 'labels',
  selectedLabels: ['VIP', 'Hot Lead', 'Follow-up Required']
}

// Database Update
db.leads.updateOne(
  { _id: leadId },
  { $set: { labels: selectedLabels } }
)
```

### When Leads are Fetched

**Endpoint:** `GET /api/admin/crm/leads`

```javascript
// Response includes labels for each lead
{
  success: true,
  data: {
    leads: [
      {
        _id: "...",
        name: "John Doe",
        phoneNumber: "9876543210",
        labels: ["VIP", "Follow-up Required"],
        // ... other fields
      }
    ]
  }
}
```

---

## 6. SUMMARY TABLE

| Component | Type | Options | Purpose |
|-----------|------|---------|---------|
| **Select Admin User** | Filter | ✅ All, + 6 hardcoded admins | Identify admin managing lead |
| **Select Workshop** | Filter | ✅ All, + dynamic workshops | Group leads by workshop interest |
| **Select Leads** | Filter | ✅ All, + search by name/phone/email | Find specific lead |
| **Labels** | Function | Custom unlimited tags | Organize & categorize leads |

---

## 7. TROUBLESHOOTING

### "All" Option Not Showing
- ✅ **Solution:** Type "all" in search box or clear search box
- Current Implementation: "All" only appears when searching for "all" or when dropdown first opens

### Labels Not Saving
- ✅ **Check:** Did you click the [Save] button?
- ✅ **Check:** Network request succeeded (check console)
- ✅ **Retry:** Click Save again

### Filter Not Showing Results
- ✅ **Check:** Are there leads with that workshop/admin?
- ✅ **Check:** Try "All" option to see full list
- ✅ **Retry:** Clear search and try again

### Duplicate Labels
- ✅ **Current Behavior:** Same label can be added multiple times
- ✅ **Solution:** Remove duplicates by clicking × on extra ones

---

## 8. TECHNICAL DETAILS

### Filter Component State
```typescript
const [searchFilterType, setSearchFilterType] = useState<'lead' | 'admin' | 'workshop'>('lead');
const [searchQuery, setSearchQuery] = useState('');
const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
const [showSearchPanel, setShowSearchPanel] = useState(false);
```

### Label Component State
```typescript
const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
const [newLabel, setNewLabel] = useState('');
```

### Key Functions
```typescript
// Add label
setSelectedLabels([...selectedLabels, newLabel.trim()]);

// Remove label
setSelectedLabels(selectedLabels.filter((_, i) => i !== idx));

// Save to database
handleSaveFollowup(); // Sends labels via API
```

---

## ✅ CHANGES MADE TODAY

✅ Added **"✅ All Admin Users"** option to Admin User filter
✅ Added **"✅ All Workshops"** option to Workshop filter
✅ Added **"✅ All Leads"** option to Leads filter
✅ These appear at the top of search results
✅ Build tested and deployed successfully

---

**Last Updated:** December 31, 2025
**Status:** Ready for Production ✅
