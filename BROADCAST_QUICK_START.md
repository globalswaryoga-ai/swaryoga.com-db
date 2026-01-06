# Broadcast Filter - Quick Start Guide

## 🎯 What You Can Do Now

### Send Broadcasts to All Leads (Filtered)

You now have **two ways** to add all leads to a broadcast list:

---

## Method 1: From the Leads Page 📋

### Step-by-Step:

1. **Go to Leads Page**
   ```
   /admin/crm/leads
   ```

2. **Apply Filters (Optional)**
   - Filter by Status: Lead, Prospect, Customer, Inactive
   - Filter by Program/Workshop: Yoga Advanced, Beginner Class, etc.
   - Filter by Admin User: Choose which admin's leads
   - Search: By name, email, or phone number

3. **Click the Blue Broadcast Button**
   - Look for: `📢 Broadcast` button in the header
   - This will open a modal showing all filtered leads

4. **Select or Create Broadcast List**
   - **Option A**: "Select Existing" → Choose from your lists
   - **Option B**: "Create New" → Name your new list (e.g., "Yoga Workshop May 2025")

5. **Click "Add to Broadcast"**
   - Modal will show success message
   - Count of added leads will be displayed
   - (Skipped = leads already in list)

---

## Method 2: From the Broadcast Page 📢

### Step-by-Step:

1. **Go to Broadcast Page**
   ```
   /admin/crm/broadcast
   ```

2. **Apply Filters (Optional)**
   - Filter by Status: Lead, Prospect, Customer, Inactive
   - Filter by Workshop: Choose program
   - Filter by Admin User: Filter by assigned admin
   - Filter by Label: Filter by lead label

3. **Click "Add All to Broadcast" Button**
   - Located next to "Select all" / "Unselect all" buttons
   - Shows: `📢 Add All to Broadcast`
   - This adds **all currently filtered leads** to a list

4. **Select or Create Broadcast List**
   - Same modal as Method 1
   - Choose existing or create new

5. **Click "Add to Broadcast"**
   - Success confirmation appears

---

## 💡 Key Points

### ✅ What Gets Added
- **Only leads matching your filters**
- If Status = "Lead" → only leads with "Lead" status
- If Workshop = "Advanced Yoga" → only those workshop leads
- If you searched "John" → only John's leads
- Combination filters work together (AND logic)

### ✅ Broadcast Lists
- Lists can contain 1-5000+ leads
- Each broadcast message goes to all members in the list
- Same lead can be in multiple lists
- Lists are created per admin user (not shared)

### ✅ No Duplicates
- If lead already in list → gets **skipped** (not re-added)
- You'll see: "Added 50, Skipped 5" if some were duplicates
- Safe to run multiple times

### ✅ Workflow Example
```
Leads Page
   ↓
Filter by Status="Customer" (100 leads)
   ↓
Click "📢 Broadcast"
   ↓
Create List: "Newsletter May 2025"
   ↓
Click "Add to Broadcast"
   ↓
✓ Added 100 leads to Newsletter May 2025
   ↓
Go to Broadcast Page
   ↓
Select "Newsletter May 2025" → Pick Template → Send to all 100
```

---

## 🎬 Common Scenarios

### Scenario 1: Send to All Customers
```
1. Leads Page → Filter Status = "Customer" (shows 150 leads)
2. Click "📢 Broadcast"
3. Create "Customer Appreciation May 2025"
4. ✓ Added 150 leads
5. Go to Broadcast page → Send message to all
```

### Scenario 2: Send to Workshop Attendees
```
1. Leads Page → Filter Workshop = "Advanced Yoga" (shows 45 leads)
2. Filter Status = "Customer" (now shows 30 leads)
3. Click "📢 Broadcast"
4. Select "Yoga Enthusiasts List"
5. ✓ Added 30 leads
6. Broadcast to them
```

### Scenario 3: Follow-up to Prospects
```
1. Leads Page → Filter Status = "Prospect" (shows 200 leads)
2. Click "📢 Broadcast"
3. Create "Prospect Follow-up Q2"
4. ✓ Added 200 leads
5. Send personalized follow-up message
```

---

## ⚙️ Technical Details

### API Endpoint (Behind the Scenes)
```
POST /api/admin/crm/broadcast-lists/{listId}/bulk-members
```

### What Happens
1. Modal sends: Array of { leadId, phoneNumber }
2. Server validates all leads
3. Adds to database with idempotent check
4. Returns: { added: N, skipped: M, total: N+M }

### Supported Filters

#### Leads Page Filters:
- ✅ Status (lead/prospect/customer/inactive)
- ✅ Workshop/Program name
- ✅ Admin User (assigned to)
- ✅ Search (name, email, phone)
- ✅ Combination of above

#### Broadcast Page Filters:
- ✅ Status (same buckets)
- ✅ Workshop
- ✅ Admin User
- ✅ Label (on leads)
- ✅ Combination of above

---

## 🚨 Troubleshooting

### "Add All to Broadcast" button is disabled
- ✅ Check if any leads match your filters
- ✅ Apply fewer filters to see more leads
- ✅ Check if page is loading (wait for spinner)

### Modal doesn't open
- ✅ Refresh page (F5)
- ✅ Check browser console for errors
- ✅ Try again

### "Failed to add leads" error
- ✅ Check authentication (you logged in?)
- ✅ Leads need valid phoneNumber
- ✅ Check network connection
- ✅ Try with fewer leads

### Leads added but seem wrong count
- ✅ Some leads might already be in list (skipped)
- ✅ Check total = added + skipped
- ✅ Leads without phone numbers are excluded

---

## 📊 Tips & Tricks

### Tip 1: Large Batches
- Can add up to 5000 leads at once
- Recommended: Create separate lists by segment (status, workshop, etc.)

### Tip 2: List Naming
- Use clear names: "Yoga Q2 2025", "Trial Users", etc.
- Don't duplicate list names (auto-deduped by system)

### Tip 3: Pre-broadcast Check
- When you add leads, note the count
- Before broadcasting, verify list count matches expected

### Tip 4: Multiple Broadcasts to Same List
- Can send different messages to same list
- Just select the list again from broadcast page
- Each broadcast is tracked separately

---

## 📚 Related Pages

- **Broadcast Page**: `/admin/crm/broadcast` - Send actual messages
- **Leads Page**: `/admin/crm/leads` - Manage lead data
- **Templates**: `/admin/crm/whatsapp/templates` - Create message templates
- **CRM Dashboard**: `/admin/crm` - Overview

---

## ✨ Summary

You now have a **powerful broadcast segmentation tool**:

1. **Filter leads** by any criteria (status, workshop, user, search)
2. **Create or select** a broadcast list
3. **Add all filtered leads** in one click
4. **Send messages** to the entire list
5. **Track results** and analytics

No more manual selection of individual leads! 🎉
