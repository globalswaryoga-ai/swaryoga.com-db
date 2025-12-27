# CRM & WhatsApp Automation - Master Guide ✅

**Last Updated:** December 27, 2025  
**Status:** Production Ready  
**Version:** 2.0

---

## 📋 Table of Contents

1. [CRM System Overview](#crm-system-overview)
2. [WhatsApp Automation & Templates](#whatsapp-automation--templates)
3. [Quick Start Guide](#quick-start-guide)
4. [API Endpoints](#api-endpoints)
5. [Database Models](#database-models)
6. [Features & Workflows](#features--workflows)
7. [Color Themes & UI](#color-themes--ui)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Performance & Limits](#performance--limits)

---

## CRM System Overview

### What is the CRM?

Enterprise-grade Customer Relationship Management system built with Next.js 14 and MongoDB. Complete with lead management, sales tracking, WhatsApp communications, compliance, and analytics.

**Status:** ✅ COMPLETE & READY FOR INTEGRATION

### Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **Leads Management** | Create, read, update, delete customer records | `/admin/crm/leads` |
| **Templates** | Design and manage WhatsApp message templates | `/admin/crm/templates` |
| **Automation** | Set up welcome messages, keyword triggers, scheduling | `/admin/crm/automation` |
| **Messages** | Track WhatsApp communication history | `/admin/crm/messages` |
| **Analytics** | Dashboard with metrics and insights | `/admin/crm/analytics` |
| **Labels** | Categorize and segment leads | `/admin/crm/leads` |

---

## WhatsApp Automation & Templates

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Admin Dashboard (/admin/crm)               │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────┐ │
│ │  Leads Manager   │ │  Template Builder │ │Automation│ │
│ └──────────────────┘ └──────────────────┘ └──────────┘ │
├─────────────────────────────────────────────────────────┤
│              API Layer (/api/admin/crm)                 │
├─────────────────────────────────────────────────────────┤
│ leads | templates | automations | messages | analytics  │
├─────────────────────────────────────────────────────────┤
│           MongoDB Database (Collections)                │
├─────────────────────────────────────────────────────────┤
│  Lead | Template | Automation | Message | Consent Log   │
└─────────────────────────────────────────────────────────┘
```

### Full-Page Template Builder 🎨

**Location:** `/admin/crm/templates/builder`  
**Lines of Code:** 763

#### Features:

- ✨ **Live iPhone Preview** - Real-time message preview
- 🎨 **6 Color Themes** - Instant switching (Emerald, Blue, Purple, Orange, Pink, Indigo)
- 📝 **Rich Text Editing** - Bold, Italic, Strikethrough formatting
- 🔘 **Button Management** - Add up to 3 interactive buttons
- 📌 **Footer Support** - Custom footer text
- 🖼️ **Header Support** - Text, Image, Video, Document headers
- 📋 **Variable System** - Dynamic fields: {name}, {phone}, {date}
- 💾 **Save Workflow** - Draft or Submit for Approval

#### Button Types:

| Type | Icon | Use Case | Example |
|------|------|----------|---------|
| **Link** | 🔗 | Direct to URL | Visit website |
| **Catalog** | 📦 | WhatsApp catalog | Browse products |
| **List** | 📋 | Menu options | Select service |
| **Phone** | 📞 | Click to call | Contact us |
| **Text** | 💬 | Quick reply | Confirm booking |

#### Color Themes:

| Theme | Colors | Best For |
|-------|--------|----------|
| **Emerald** | Green tones | Nature, wellness, yoga |
| **Blue** | Blue tones | Professional, corporate |
| **Purple** | Purple tones | Luxury, premium |
| **Orange** | Orange tones | Energy, action, urgency |
| **Pink** | Pink tones | Social, feminine, playful |
| **Indigo** | Indigo tones | Spiritual, meditation |

### Automation Center 🤖

**Location:** `/admin/crm/automation`  
**Lines of Code:** 610

#### 4 Automation Types:

**1. 👋 Welcome Messages**
- Trigger: New customer added
- Action: Auto-send greeting message
- Use: First-time customer onboarding

**2. 🔑 Keyword Triggers**
- Trigger: Customer messages specific word
- Action: Auto-reply with predefined response
- Use: FAQ automation, quick responses

**3. 📅 Scheduled Messages**
- Trigger: Specific date/time
- Action: Send message to selected leads
- Use: Campaign sends, reminders, announcements

**4. 📢 Broadcast Lists**
- Trigger: Manual send
- Action: Send to group of leads
- Use: Group announcements, bulk messaging

---

## Quick Start Guide

### Step 1: Access the CRM

```
Admin Dashboard: /admin
Login Required: username + password
JWT Token: Stored in localStorage.admin_token
```

### Step 2: Create Your First Lead

```
Path: /admin/crm/leads
Click: "+ Create Lead"
Fill in:
  - Phone Number (required)
  - Email (optional)
  - Name (optional)
  - Status (lead, prospect, customer, inactive)
  - Labels (optional, for categorization)
  - Source (website, import, api, manual, whatsapp, referral, social, event)
```

### Step 3: Create a Message Template

```
Path: /admin/crm/templates
Click: "✨ Advanced Builder"
Steps:
  1. Enter template name
  2. Select category (Marketing, Transactional, OTP, Account Update)
  3. Select language
  4. Write message body (use formatting toolbar)
  5. Add up to 3 buttons (click "+ Add Button")
  6. Choose color theme
  7. Click "Save as Draft" or "Submit for Approval"
```

### Step 4: Set Up Automation

```
Path: /admin/crm/automation
Choose Tab: Welcome / Keywords / Scheduled / Broadcast
Click: "+ Create" button
Fill in rule details:
  - Name
  - Trigger type
  - Action
  - Message content
Click: "Create Rule"
Toggle: Enable/Disable as needed
```

### Step 5: Send Message

```
Choose Method:
  Option A: Manual via /admin/crm/messages
    - Select leads
    - Choose template
    - Send immediately
  
  Option B: Use automation (runs automatically)
    - Trigger conditions met
    - Message sends automatically
```

---

## API Endpoints

### Base URL
```
http://localhost:3000/api/admin/crm
```

### Authentication
```
Header: Authorization: Bearer <JWT_TOKEN>
Token Claims Required: { isAdmin: true }
Duration: 7 days
```

### Leads Endpoints

#### GET /leads
**Get all leads with pagination and filtering**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/leads?status=prospect&limit=50&skip=0"
```

**Query Parameters:**
- `status` - Filter by status (lead, prospect, customer, inactive)
- `workshop` - Filter by workshop name
- `q` - Search by name, phone, or email
- `limit` - Items per page (default: 50, max: 200)
- `skip` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "phoneNumber": "+919876543210",
        "email": "user@example.com",
        "name": "John Doe",
        "status": "prospect",
        "labels": ["interested", "yoga"],
        "source": "website",
        "workshopId": "607f1f77bcf86cd799439012",
        "workshopName": "Beginner Yoga",
        "lastMessageAt": "2025-12-27T10:30:00Z",
        "createdAt": "2025-12-20T10:30:00Z",
        "updatedAt": "2025-12-27T10:30:00Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "skip": 0
  }
}
```

#### POST /leads
**Create a single lead**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "status": "lead",
    "labels": ["yoga", "interested"],
    "source": "website"
  }' \
  "http://localhost:3000/api/admin/crm/leads"
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "phoneNumber": "+919876543210",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "status": "lead",
    "labels": ["yoga", "interested"],
    "source": "website",
    "createdAt": "2025-12-27T10:30:00Z"
  }
}
```

**Error (409 - Duplicate):**
```json
{
  "error": "Lead already exists",
  "data": { "existingLead": {...} }
}
```

#### GET /leads/[id]
**Get individual lead**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/leads/507f1f77bcf86cd799439011"
```

#### PUT /leads/[id]
**Update lead**

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "customer",
    "labels": ["yoga", "interested", "purchased"]
  }' \
  "http://localhost:3000/api/admin/crm/leads/507f1f77bcf86cd799439011"
```

#### DELETE /leads/[id]
**Delete lead**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/leads/507f1f77bcf86cd799439011"
```

#### POST /leads/bulk
**Bulk operations**

```bash
# Bulk import
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "import",
    "leads": [
      { "phoneNumber": "+919876543210", "name": "User 1" },
      { "phoneNumber": "+919876543211", "name": "User 2" }
    ]
  }' \
  "http://localhost:3000/api/admin/crm/leads/bulk"

# Bulk update status
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "updateStatus",
    "leadIds": ["507f1f77bcf86cd799439011"],
    "status": "customer"
  }' \
  "http://localhost:3000/api/admin/crm/leads/bulk"

# Bulk export
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/leads/bulk?operation=export&format=csv"
```

### Templates Endpoints

#### GET /templates
**List all templates**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/templates"
```

#### POST /templates
**Create template**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "Welcome Message",
    "category": "Marketing",
    "language": "English",
    "templateContent": "Welcome {name}!",
    "buttons": [
      {
        "text": "Visit Website",
        "type": "link",
        "payload": "https://swaryoga.com"
      }
    ],
    "theme": {
      "colorIndex": 0,
      "themeName": "Emerald"
    },
    "status": "draft"
  }' \
  "http://localhost:3000/api/admin/crm/templates"
```

#### PUT /templates/[id]
**Update template**

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }' \
  "http://localhost:3000/api/admin/crm/templates/507f1f77bcf86cd799439011"
```

#### DELETE /templates/[id]
**Delete template**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/templates/507f1f77bcf86cd799439011"
```

### Automation Endpoints

#### GET /automations
**List automation rules**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/automations?triggerType=welcome"
```

#### POST /automations
**Create automation rule**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome New Customers",
    "triggerType": "welcome",
    "actionType": "send_message",
    "actionText": "Welcome {name}!",
    "enabled": true
  }' \
  "http://localhost:3000/api/admin/crm/automations"
```

#### PUT /automations/[id]
**Update automation (e.g., enable/disable)**

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }' \
  "http://localhost:3000/api/admin/crm/automations/507f1f77bcf86cd799439011"
```

#### DELETE /automations/[id]
**Delete automation**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/automations/507f1f77bcf86cd799439011"
```

### Messages Endpoints

#### GET /messages
**Get message history**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/messages?leadId=507f1f77bcf86cd799439011"
```

#### POST /messages
**Send message**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadIds": ["507f1f77bcf86cd799439011"],
    "templateId": "607f1f77bcf86cd799439012",
    "message": "Hello {name}"
  }' \
  "http://localhost:3000/api/admin/crm/messages"
```

### Analytics Endpoints

#### GET /analytics
**Get dashboard analytics**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/analytics?view=overview"
```

**View Options:** overview, leads, messages, conversions, engagement, sales

---

## Database Models

### Lead Schema

```javascript
{
  _id: ObjectId,
  phoneNumber: String (required, unique, indexed),
  email: String (optional, lowercase, trimmed),
  name: String (optional, trimmed),
  status: enum(['lead', 'prospect', 'customer', 'inactive']),
  labels: [String] (indexed for categorization),
  source: enum(['website', 'import', 'api', 'manual', 'whatsapp', 'referral', 'social', 'event']),
  workshopId: ObjectId (ref to WorkshopSchedule, sparse),
  workshopName: String (denormalized for queries),
  lastMessageAt: Date (tracks WhatsApp engagement),
  metadata: Mixed (custom fields),
  createdAt: Date,
  updatedAt: Date
}
```

### WhatsAppTemplate Schema

```javascript
{
  _id: ObjectId,
  templateName: String (required),
  category: String (Marketing, Transactional, OTP, Account Update),
  language: String (English, Hindi, Marathi),
  templateContent: String,
  headerFormat: String (NONE, TEXT, IMAGE, VIDEO, DOCUMENT),
  headerContent: String,
  footerText: String,
  buttons: [{
    text: String,
    type: enum(['link', 'catalog', 'list', 'phone', 'text']),
    payload: String
  }],
  variables: [String],
  theme: {
    colorIndex: Number,
    themeName: String
  },
  status: enum(['draft', 'pending_approval', 'approved', 'rejected']),
  createdAt: Date,
  updatedAt: Date,
  approvedBy: ObjectId (ref to User, optional)
}
```

### AutomationRule Schema

```javascript
{
  _id: ObjectId,
  name: String (required),
  triggerType: enum(['welcome', 'keyword', 'scheduled', 'broadcast']),
  actionType: String,
  actionText: String,
  enabled: Boolean (default: true),
  throttle: Number (optional, milliseconds),
  createdAt: Date,
  updatedAt: Date
}
```

### WhatsAppMessage Schema

```javascript
{
  _id: ObjectId,
  leadId: ObjectId (ref to Lead),
  templateId: ObjectId (ref to WhatsAppTemplate),
  content: String,
  status: enum(['queued', 'sent', 'delivered', 'read', 'failed']),
  direction: enum(['inbound', 'outbound']),
  messageId: String (WhatsApp message ID),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Features & Workflows

### Workflow 1: Create and Send Welcome Message

```
1. Create Lead
   POST /leads with phone number
   → Lead created with status: 'lead'

2. Create Welcome Template
   POST /templates with message
   → Template status: 'draft'

3. Approve Template
   PUT /templates/[id] with status: 'approved'
   → Template ready for use

4. Create Welcome Automation
   POST /automations
   - triggerType: 'welcome'
   - actionType: 'send_message'
   → Automation enabled

5. Lead Gets Welcome
   When new lead created
   → Automation triggers
   → Message sent automatically
   → Message status: 'sent'
```

### Workflow 2: Keyword Trigger & Auto-Reply

```
1. Create Response Template
   POST /templates
   → Template created and approved

2. Create Keyword Rule
   POST /automations
   - triggerType: 'keyword'
   - keywords: ['help', 'info']
   - actionText: 'Here is helpful info...'

3. Customer Messages Keyword
   Customer sends "help" to WhatsApp
   → Automation detects keyword
   → Auto-reply sent
   → Message logged

4. Track Engagement
   GET /messages?leadId=xxx
   → See all interactions
```

### Workflow 3: Schedule Bulk Message

```
1. Create Message Template
   POST /templates
   → Template approved

2. Create Broadcast List
   POST /automations
   - triggerType: 'broadcast'
   - Recipients: [list of lead IDs]

3. Schedule Send
   PUT /automations/[id]
   - scheduledAt: '2025-12-28T10:00:00Z'

4. Message Sends
   At scheduled time → Message queued → Messages sent

5. Track Status
   GET /messages
   → View sent/delivered/failed status
```

### Workflow 4: Bulk Import Leads

```
1. Prepare CSV/JSON
   Format: phone, email, name, status, labels, source

2. Import Leads
   POST /leads/bulk
   - operation: 'import'
   - leads: [array of lead objects]

3. Duplicate Check
   System checks for existing phones/emails
   → Duplicates skipped
   → New leads created

4. Response Shows
   - imported: count of new leads
   - skipped: count of duplicates
   - failed: count of errors

5. Update Lead Statuses
   POST /leads/bulk
   - operation: 'updateStatus'
   - leadIds: [array]
   - status: 'prospect'
```

---

## Color Themes & UI

### Theme Color Reference

#### Emerald (Green)
```
Primary: #10b981
Accent: #059669
Background: #ecfdf5
Usage: Nature, wellness, yoga, health
RGB: rgb(16, 185, 129)
```

#### Blue
```
Primary: #3b82f6
Accent: #1d4ed8
Background: #eff6ff
Usage: Professional, corporate, tech
RGB: rgb(59, 130, 246)
```

#### Purple
```
Primary: #a855f7
Accent: #7c3aed
Background: #faf5ff
Usage: Luxury, premium, spiritual
RGB: rgb(168, 85, 247)
```

#### Orange
```
Primary: #f97316
Accent: #ea580c
Background: #fff7ed
Usage: Energy, action, urgency, call-to-action
RGB: rgb(249, 115, 22)
```

#### Pink
```
Primary: #ec4899
Accent: #db2777
Background: #fdf2f8
Usage: Social, feminine, playful, community
RGB: rgb(236, 72, 153)
```

#### Indigo
```
Primary: #6366f1
Accent: #4f46e5
Background: #eef2ff
Usage: Spiritual, meditation, peace
RGB: rgb(99, 102, 241)
```

### Dynamic Theme Application

When theme is selected:
1. All primary colors change to theme color
2. All accent colors change to theme accent
3. All background colors change to theme background
4. Live preview updates instantly
5. No page refresh needed
6. Settings saved to database

---

## Common Tasks

### Task 1: Export Leads as CSV

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/leads/bulk?operation=export&format=csv" \
  -o leads.csv
```

### Task 2: Search for Leads

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/leads?q=john&limit=20"
```

**Searches across:** name, phone number, email

### Task 3: Tag Multiple Leads

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "updateStatus",
    "leadIds": ["id1", "id2", "id3"],
    "labels": ["vip", "interested"]
  }' \
  "http://localhost:3000/api/admin/crm/leads/bulk"
```

### Task 4: Get Label Statistics

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/labels"
```

**Response:** All labels with usage count and percentage

### Task 5: View Analytics Dashboard

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/analytics?view=overview"
```

**Available Views:** overview, leads, messages, conversions, engagement, sales

---

## Troubleshooting

### Issue 1: "Unauthorized" Error

**Symptom:** All API calls return 401 Unauthorized

**Solution:**
1. Check JWT token exists: `echo $ADMIN_TOKEN`
2. Verify token is valid: Token must have `isAdmin: true` claim
3. Verify Authorization header: `Authorization: Bearer <token>`
4. Check token expiration: Tokens expire after 7 days
5. Get new token: Re-login at `/admin/login`

### Issue 2: E11000 Duplicate Key Error

**Symptom:** Bulk import fails with "duplicate key error"

**Cause:** Phone number or email already exists in database

**Solution:**
```bash
# Option 1: Check if lead exists
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/leads?q=+919876543210"

# Option 2: Remove duplicates from import file
# Edit CSV/JSON to exclude existing numbers

# Option 3: Update existing lead instead
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/leads/[id]" \
  -d '{"status": "customer"}'
```

### Issue 3: Message Not Sending

**Symptom:** Message stays in 'queued' status

**Causes:**
1. Lead phone number invalid - Check phone format (must include country code)
2. WhatsApp API down - Check service status
3. Lead opted out - Check ConsentLog
4. Message template not approved - Approve template first

**Solution:**
```bash
# Check message status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/messages?leadId=xxx"

# Check consent log
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/consent?phoneNumber=+919876543210"
```

### Issue 4: Automation Rule Not Triggering

**Symptom:** Rule created but not executing

**Causes:**
1. Rule disabled - Check enabled flag
2. Trigger conditions not met - Review trigger configuration
3. Rate limiting - Check throttle setting (milliseconds)
4. Database connection lost - Restart server

**Solution:**
```bash
# Check rule status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/automations"

# Enable rule
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/crm/automations/[id]" \
  -d '{"enabled": true}'
```

### Issue 5: Template Not Saving

**Symptom:** Template save fails silently

**Causes:**
1. Template name empty - Name is required
2. Category not selected - Category is required
3. Content too long - Check character limit
4. Invalid JSON in buttons - Verify button structure
5. Session expired - Re-login

**Solution:**
1. Fill in all required fields
2. Reduce content length
3. Verify button JSON structure
4. Clear browser cache and re-login
5. Check console for error messages

---

## Performance & Limits

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET /leads | 1000 | 1 hour |
| POST /leads | 100 | 1 hour |
| POST /messages | 500 | 1 hour |
| POST /automations | 100 | 1 hour |
| POST /leads/bulk | 50 | 1 hour |

### Data Limits

| Item | Limit |
|------|-------|
| Template name | 255 characters |
| Message content | 4096 characters |
| Button text | 20 characters |
| Footer text | 60 characters |
| Buttons per message | 3 maximum |
| Variables per template | 10 maximum |
| Leads per bulk import | 5000 maximum |
| Leads per broadcast | 100000 maximum |

### Response Times

| Operation | Target Time |
|-----------|------------|
| Get leads (100 items) | < 200ms |
| Create lead | < 100ms |
| Send message | < 500ms |
| Export CSV (1000 leads) | < 2s |
| Bulk import (1000 leads) | < 10s |
| Analytics dashboard | < 1s |

### Database Indexes

```javascript
// Leads collection
db.leads.createIndex({ phoneNumber: 1 }) // Unique, required
db.leads.createIndex({ status: 1, lastMessageAt: -1 })
db.leads.createIndex({ labels: 1 })
db.leads.createIndex({ source: 1 })

// Templates collection
db.templates.createIndex({ templateName: 1 })
db.templates.createIndex({ status: 1 })

// Messages collection
db.messages.createIndex({ leadId: 1, createdAt: -1 })
db.messages.createIndex({ status: 1 })

// Automations collection
db.automations.createIndex({ enabled: 1 })
db.automations.createIndex({ triggerType: 1 })
```

---

## File Structure

### Key Files

```
/app/admin/
├── crm/
│   ├── leads/
│   │   └── page.tsx (Leads management UI)
│   ├── templates/
│   │   ├── page.tsx (Template list & modal editor)
│   │   └── builder/
│   │       └── page.tsx (Full-page template builder - 763 lines)
│   ├── automation/
│   │   └── page.tsx (Automation center - 610 lines)
│   ├── messages/
│   │   └── page.tsx (Message history UI)
│   └── analytics/
│       └── page.tsx (Analytics dashboard)
│
/app/api/admin/crm/
├── leads/
│   ├── route.ts (Create/Read leads)
│   └── [id]/route.ts (Update/Delete leads)
├── leads/bulk/
│   └── route.ts (Bulk operations)
├── templates/
│   ├── route.ts (Template CRUD)
│   └── [id]/route.ts (Individual template)
├── automations/
│   ├── route.ts (Automation CRUD)
│   └── [id]/route.ts (Individual automation)
├── messages/
│   └── route.ts (Send/Get messages)
└── analytics/
    └── route.ts (Analytics queries)

/lib/
├── db.ts (All database schemas)
└── auth.ts (JWT authentication)
```

---

## Summary

This master guide consolidates:
- ✅ CRM system overview and architecture
- ✅ WhatsApp automation and templates (full features)
- ✅ All 10+ API endpoints with examples
- ✅ Database model specifications
- ✅ Common workflows and use cases
- ✅ Color theme reference
- ✅ Performance and limits
- ✅ Troubleshooting guide
- ✅ Quick start instructions

**For detailed API reference:** See individual endpoint sections above

**For quick tasks:** See "Common Tasks" section

**For errors:** See "Troubleshooting" section

---

## Next Steps

1. **Access CRM:** Navigate to `/admin`
2. **Create First Lead:** Add a customer
3. **Build Template:** Design a message with the advanced builder
4. **Set Up Automation:** Create a welcome message rule
5. **Send Message:** Test the complete flow
6. **Monitor Analytics:** Track performance and engagement

**Support:** Refer to "Troubleshooting" section for any issues

---

*Last Updated: December 27, 2025 | Version 2.0 | Production Ready*
