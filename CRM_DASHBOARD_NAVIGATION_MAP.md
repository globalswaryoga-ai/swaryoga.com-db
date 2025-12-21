# CRM Dashboard - Navigation Map & Visual Guide

## 🗺️ Dashboard Site Map

```
Admin Panel
│
└── /admin/crm (Main Dashboard)
    │
    ├── 📊 Overview
    │   ├── Stats Cards (Leads, Sales, Messages, Conversion)
    │   ├── Quick Actions (Add Lead, Send Message, Record Sale)
    │   └── System Status
    │
    ├── 👥 Leads (/admin/crm/leads)
    │   ├── Search by Name/Email/Phone
    │   ├── Filter by Status (Lead, Prospect, Customer, Inactive)
    │   ├── Create New Lead
    │   ├── Update Status
    │   ├── Delete Lead
    │   └── Pagination
    │
    ├── 💰 Sales (/admin/crm/sales)
    │   ├── View Modes
    │   │   ├── List View (individual sales)
    │   │   ├── Summary View (metrics)
    │   │   ├── Daily View (aggregates)
    │   │   └── Monthly View (aggregates)
    │   ├── Record New Sale
    │   ├── Delete Sale
    │   └── Revenue Analytics
    │
    ├── 💬 Messages (/admin/crm/messages)
    │   ├── Message List
    │   ├── Search & Filter
    │   │   ├── By Status (Pending, Sent, Delivered, Failed, Read)
    │   │   └── By Direction (Inbound, Outbound)
    │   ├── Send New Message
    │   ├── Retry Failed Messages
    │   ├── View Message Details
    │   ├── Delete Messages
    │   └── Pagination
    │
    ├── 📈 Analytics (/admin/crm/analytics)
    │   ├── Overview (4 KPIs)
    │   ├── Leads Analytics (status breakdown)
    │   ├── Sales Analytics (revenue metrics)
    │   ├── Messages Analytics (status breakdown)
    │   ├── Conversion Funnel (with visualization)
    │   └── Trends (Daily & Weekly)
    │
    ├── 📝 Templates (/admin/crm/templates)
    │   ├── Template Gallery
    │   ├── Create Template
    │   │   ├── Name
    │   ├── Category (Message, Notification, Reminder, Promotional)
    │   │   └── Content with Variables
    │   ├── Approval Workflow
    │   │   ├── Draft → Approve
    │   │   └── Draft → Reject
    │   ├── Variable Detection
    │   ├── Template Preview
    │   ├── Filter by Status
    │   ├── Delete Template
    │   └── Pagination
    │
    └── ✅ Consent (/admin/crm/permissions)
        ├── Consent Records
        ├── Grant New Consent
        │   ├── Lead ID
        │   ├── Select Types
        │   │   ├── Marketing
        │   │   ├── SMS
        │   │   ├── Email
        │   │   ├── WhatsApp
        │   │   ├── Calls
        │   │   └── Data Processing
        │   └── Status (Granted/Withdrawn)
        ├── Withdraw Consent
        ├── Filter by Type
        ├── Filter by Status
        ├── View Consent Details
        ├── Delete Records
        └── Pagination
```

---

## 🎯 User Journey Maps

### Journey 1: Managing a Lead from Start to Sale

```
START
  ↓
1. Navigate to Leads page (/admin/crm/leads)
  ↓
2. Click "+ Add Lead" button
  ↓
3. Fill form:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Phone: "+919876543210"
   - Source: "Website"
   - Status: "Lead"
  ↓
4. Click "Create Lead"
  ↓
5. Lead appears in table with "Lead" status
  ↓
6. Later: Click status dropdown on lead
  ↓
7. Change status: Lead → Prospect → Customer
  ↓
8. Navigate to Sales page (/admin/crm/sales)
  ↓
9. Click "+ Record Sale"
  ↓
10. Enter:
    - Lead ID: [Lead's ID]
    - Amount: 5000
    - Payment Mode: PayU
  ↓
11. Click "Record Sale"
  ↓
12. Sale appears in Sales List/Summary
  ↓
13. Check Analytics page for updated metrics
  ↓
END
```

### Journey 2: Setting Up Message Templates

```
START
  ↓
1. Navigate to Templates page (/admin/crm/templates)
  ↓
2. Click "+ Create Template"
  ↓
3. Fill form:
   - Name: "Welcome Message"
   - Category: "Message"
   - Content: "Hi {name}, welcome to {company}!"
  ↓
4. Click "Create" (Template created in Draft status)
  ↓
5. Template appears in gallery with "draft" label
  ↓
6. Click template card to view details
  ↓
7. Verify variables detected: {name}, {company}
  ↓
8. Click "Approve" button
  ↓
9. Status changes from "draft" to "approved"
  ↓
10. Template now ready to use in messages
  ↓
END
```

### Journey 3: Managing User Consent

```
START
  ↓
1. Navigate to Consent page (/admin/crm/permissions)
  ↓
2. Click "+ Grant Consent"
  ↓
3. Enter Lead ID
  ↓
4. Select consent types (checkboxes):
   ☑ Marketing Communications
   ☑ SMS Messages
   ☑ Email Notifications
   ☐ WhatsApp Messages
   ☐ Phone Calls
   ☐ Data Processing
  ↓
5. Status: "Granted" (default)
  ↓
6. Click "Save"
  ↓
7. Consent record appears in table
  ↓
8. Filter table by consent type
  ↓
9. Click on record to view details
  ↓
10. If needed, click "Withdraw Consent"
  ↓
11. Status changes to "Withdrawn"
  ↓
12. Timestamp recorded for audit trail
  ↓
END
```

### Journey 4: Viewing Analytics & Reports

```
START
  ↓
1. Navigate to Analytics page (/admin/crm/analytics)
  ↓
2. Default view: "Overview" tab
   Shows: Total Leads, Sales, Messages, Conversion Rate
  ↓
3. Click "Leads" tab
   Shows: Lead breakdown by status
  ↓
4. Click "Sales" tab
   Shows: Revenue metrics, payment method breakdown
  ↓
5. Click "Messages" tab
   Shows: Message count by status
  ↓
6. Click "Conversion" tab
   Shows: Funnel visualization, drop-off rate
  ↓
7. Click "Trends" tab
   Shows: Daily and weekly trend tables
  ↓
8. Click "🔄 Refresh" button to reload data
  ↓
END
```

---

## 🎨 Visual Component Map

### Color Legend

| Color | Meaning | Usage |
|-------|---------|-------|
| 🟢 Green | Success / Granted / Approve | Positive actions, approved items |
| 🔴 Red | Delete / Failed / Rejected / Withdrawn | Destructive actions, negative states |
| 🔵 Blue | Info / Sent / Sales | Information, completed actions |
| 🟡 Yellow | Warning / Pending / Draft | Caution, pending states |
| 🟣 Purple | Primary / Default | Main actions, default state |
| 🟠 Orange | Secondary / In Progress | Secondary actions, processing |

### Status Badge Examples

```
┌─────────────────────────────────────────┐
│ LEAD STATUSES                           │
├─────────────────────────────────────────┤
│ 🟦 Lead       - Just entered pipeline   │
│ 🟦 Prospect   - Interested in service   │
│ 🟩 Customer   - Converted from prospect │
│ ⬜ Inactive   - Not pursuing further    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ MESSAGE STATUSES                        │
├─────────────────────────────────────────┤
│ 🟡 Pending    - Queued to send          │
│ 🔵 Sent       - Sent to recipient       │
│ 🟣 Delivered  - Confirmed delivery      │
│ 🔴 Failed     - Failed to deliver       │
│ 🟩 Read       - Recipient read message  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ TEMPLATE STATUSES                       │
├─────────────────────────────────────────┤
│ ✏️ Draft      - Editing in progress     │
│ ✅ Approved   - Ready to use            │
│ ❌ Rejected   - Not approved for use    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CONSENT STATUSES                        │
├─────────────────────────────────────────┤
│ ✓ Granted    - User gave permission    │
│ ✗ Withdrawn  - User revoked permission │
└─────────────────────────────────────────┘
```

---

## 📱 Mobile View Transformations

### Desktop View
```
┌────────────────────────────────────────────────┐
│ ═══════════════════ Navbar ═══════════════════ │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │ Content Area                         │
│ - Home   │ ┌──────────────────────────────────┐ │
│ - Leads  │ │ Page Title                       │ │
│ - Sales  │ ├──────────────────────────────────┤ │
│ - Msgs   │ │ 4-Column Grid / Table            │ │
│ - ...    │ │                                  │ │
│          │ │                                  │ │
└──────────┴──────────────────────────────────────┘
```

### Tablet View
```
┌────────────────────────────────┐
│ ═════════ Navbar ═════════     │
├────────────────────────────────┤
│ Sidebar (collapsed)            │
├────────────────────────────────┤
│ Content Area                   │
│ ┌──────────────────────────┐   │
│ │ Page Title               │   │
│ ├──────────────────────────┤   │
│ │ 2-Column Grid            │   │
│ │                          │   │
│ └──────────────────────────┘   │
└────────────────────────────────┘
```

### Mobile View
```
┌──────────────────┐
│ ☰ CRM Dashboard  │ (Hamburger menu)
├──────────────────┤
│ Content Area     │
│ ┌──────────────┐ │
│ │ Page Title   │ │
│ ├──────────────┤ │
│ │ Single Col   │ │
│ │ Layout       │ │
│ │              │ │
│ └──────────────┘ │
└──────────────────┘
```

---

## 🔄 Data Flow Diagram

### Lead Creation Flow
```
User Input (Form)
      ↓
  Validation
      ↓
  API Call (POST /api/admin/crm/leads)
      ↓
  Backend Processing
      ↓
  MongoDB Insert
      ↓
  Success Response
      ↓
  Update UI Table
      ↓
  Show Success Toast
      ↓
  Close Modal
```

### Message Sending Flow
```
User Input (Message + Lead ID)
      ↓
  Validation
      ↓
  API Call (POST /api/admin/crm/messages)
      ↓
  Backend Queuing
      ↓
  WhatsApp Gateway
      ↓
  Message Status: Pending
      ↓
  Async Delivery
      ↓
  Status Update: Sent/Delivered
      ↓
  UI Refresh (via polling)
      ↓
  Display Status in Table
```

### Analytics Data Flow
```
User Selects View Mode
      ↓
  API Call (GET /api/admin/crm/analytics?view=X)
      ↓
  Backend Aggregation
      ↓
  Database Queries
      ↓
  Data Processing
      ↓
  JSON Response
      ↓
  Frontend Display
      ↓
  Render Charts/Tables
      ↓
  Show Metrics
```

---

## 🎯 Quick Reference - Common Actions

### Add a Lead
```
Step 1: Navigate → Leads page
Step 2: Click → "+ Add Lead"
Step 3: Fill → Name, Email, Phone, Source, Status
Step 4: Click → "Create Lead"
```

### Update Lead Status
```
Step 1: Find → Lead in table
Step 2: Click → Status dropdown
Step 3: Select → New status
Step 4: Done → Auto-saves
```

### Send a Message
```
Step 1: Navigate → Messages page
Step 2: Click → "+ Send Message"
Step 3: Enter → Lead ID
Step 4: Type → Message content
Step 5: Click → "Send"
```

### View Analytics
```
Step 1: Navigate → Analytics page
Step 2: Click → Tab (Overview/Leads/Sales/etc)
Step 3: View → Metrics and trends
Step 4: Click → "🔄 Refresh" for latest data
```

### Create Template
```
Step 1: Navigate → Templates page
Step 2: Click → "+ Create Template"
Step 3: Fill → Name, Category, Content
Step 4: Click → "Create"
Step 5: Approve → Click "Approve" on card
```

### Grant Consent
```
Step 1: Navigate → Consent page
Step 2: Click → "+ Grant Consent"
Step 3: Enter → Lead ID
Step 4: Select → Consent types (checkboxes)
Step 5: Click → "Save"
```

---

## 🔍 Page Load Sequence

```
User logs in
      ↓
Token stored in localStorage
      ↓
Navigate to /admin/crm
      ↓
Check auth token (useEffect)
      ↓
Fetch analytics overview
      ↓
Page renders with stats
      ↓
Sidebar navigation available
      ↓
User can click any section
      ↓
New page loads
      ↓
Fetch page-specific data
      ↓
Display content
```

---

## 📊 Table Column Reference

### Leads Table
| Column | Type | Sortable | Filterable | Editable |
|--------|------|----------|-----------|----------|
| Name | String | No | Yes | No |
| Email | String | No | Yes | No |
| Phone | String | No | Yes | No |
| Status | Enum | No | Yes | Yes |
| Source | String | No | No | No |
| Created | Date | No | No | No |
| Actions | Button | No | No | Yes |

### Sales Table (List View)
| Column | Type | Format |
|--------|------|--------|
| Lead ID | String | 6-char suffix |
| Amount | Number | ₹ currency |
| Payment Mode | Enum | Text |
| Date | Date | DD/MM/YYYY |
| Actions | Button | Delete |

### Messages Table
| Column | Type | Information |
|--------|------|------------|
| Direction | Emoji | 📨 Inbound / 📤 Outbound |
| Lead ID | String | 6-char suffix |
| Message | String | Clipped to 2 lines |
| Status | Badge | Color-coded |
| Date | Timestamp | Full timestamp |
| Actions | Button | View/Retry/Delete |

### Templates Table
| Column | Type | Information |
|--------|------|------------|
| Name | String | Template name |
| Category | String | message/notification/etc |
| Status | Badge | draft/approved/rejected |
| Variables | Pills | {var1} {var2} |
| Created | Date | DD/MM/YYYY |
| Actions | Buttons | View/Approve/Reject/Delete |

---

## ⌨️ Keyboard Shortcuts (Future)

| Shortcut | Action | Status |
|----------|--------|--------|
| Esc | Close modal/dialog | Implemented ✓ |
| Ctrl+N | New record | Planned |
| Ctrl+F | Search/Filter | Planned |
| Ctrl+S | Save form | Planned |
| Ctrl+Shift+D | Dark theme toggle | Planned |

---

## 🎓 Learning Path for New Users

### Day 1: Basics
- [ ] Understand navigation
- [ ] View dashboard overview
- [ ] Explore each page
- [ ] Review color/status meanings

### Day 2: Core Operations
- [ ] Create a test lead
- [ ] Update lead status
- [ ] Create message template
- [ ] Send a test message

### Day 3: Advanced Features
- [ ] View analytics in all modes
- [ ] Record a sale
- [ ] Grant user consent
- [ ] Review trends

### Day 4: Mastery
- [ ] Manage multiple leads
- [ ] Track sales pipeline
- [ ] Monitor message status
- [ ] Analyze conversion funnel

---

## 🚀 Pro Tips

1. **Search Efficiency**: Use specific keywords (email is faster than name)
2. **Filtering**: Combine multiple filters for precision
3. **Status Updates**: Do in bulk via list view instead of individually
4. **Analytics**: Check trends weekly for insights
5. **Templates**: Create once, reuse many times
6. **Consent**: Grant all types at once, withdraw individually
7. **Messages**: Monitor failed status and retry promptly
8. **Pagination**: Use filters to reduce data size

---

**Navigation Guide Complete** ✅

For more details, see the full documentation files.
