# CRM API Reference

Complete API reference for the Swar Yoga Web CRM backend. All endpoints require admin authentication.

## Authentication

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

The token is verified server-side and must include admin privileges.

---

## Core CRM Endpoints

### 1. Leads Management API
**Base**: `/api/admin/crm/leads`

#### GET - Fetch leads
```bash
GET /api/admin/crm/leads?page=1&limit=20&status=lead&search=john
```

**Query Parameters**:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20, max: 200)
- `skip` (optional): Number of items to skip (alternative to page)
- `status` (optional): Filter by status - `lead`, `prospect`, `customer`, `inactive`
- `source` (optional): Filter by source - `website`, `referral`, `social`, `event`
- `search` (optional): Search by name, phone, or email (case-insensitive)
- `tags` (optional): Filter by tags (comma-separated)

**Response**:
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+919876543210",
        "status": "prospect",
        "source": "website",
        "tags": ["interested", "qualified"],
        "lastMessageAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-10T10:00:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "pages": 8
  }
}
```

#### POST - Create lead
```bash
POST /api/admin/crm/leads
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phoneNumber": "+919876543210",
  "source": "referral",
  "status": "lead",
  "tags": ["vinyasa", "morning"]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phoneNumber": "+919876543210",
    "source": "referral",
    "status": "lead",
    "tags": ["vinyasa", "morning"],
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

#### GET - Get single lead
```bash
GET /api/admin/crm/leads/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+919876543210",
    "status": "prospect",
    "source": "website",
    "tags": ["interested"],
    "metadata": {
      "lastInteractionDate": "2024-01-15T10:30:00Z",
      "classesAttended": 5
    }
  }
}
```

#### PATCH - Update lead
```bash
PATCH /api/admin/crm/leads/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "status": "customer",
  "tags": ["interested", "purchased"]
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "status": "customer",
    "tags": ["interested", "purchased"]
  }
}
```

#### DELETE - Delete lead
```bash
DELETE /api/admin/crm/leads/507f1f77bcf86cd799439011
```

**Response** (200):
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

### 2. Bulk Operations API
**Base**: `/api/admin/crm/leads/bulk`

#### POST - Bulk operations
```bash
POST /api/admin/crm/leads/bulk
Content-Type: application/json

{
  "action": "import",
  "leads": [
    {
      "name": "Lead 1",
      "email": "lead1@example.com",
      "phoneNumber": "+919876543210",
      "source": "csv_import",
      "tags": ["bulk", "import"]
    },
    {
      "name": "Lead 2",
      "email": "lead2@example.com",
      "phoneNumber": "+919876543211",
      "source": "csv_import"
    }
  ]
}
```

**Actions**:
- `import`: Bulk add leads (prevents duplicates)
- `updateStatus`: Change status for multiple leads
  ```json
  {
    "action": "updateStatus",
    "leadIds": ["id1", "id2"],
    "status": "customer"
  }
  ```
- `updateLabels`: Add/remove labels
  ```json
  {
    "action": "updateLabels",
    "leadIds": ["id1", "id2"],
    "mode": "add",
    "labels": ["vip", "contacted"]
  }
  ```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "action": "import",
    "totalProcessed": 100,
    "successCount": 98,
    "duplicateCount": 2,
    "errorCount": 0,
    "errors": []
  }
}
```

#### GET - Export leads
```bash
GET /api/admin/crm/leads/bulk?action=export&format=csv&limit=10000
```

**Query Parameters**:
- `action`: `export`
- `format`: `csv` or `json`
- `limit` (optional): Max items to export (default: 1000, max: 10000)
- `status` (optional): Filter by status before export

**Response** (CSV format):
```
name,email,phoneNumber,status,source,tags,lastMessageAt,createdAt
John Doe,john@example.com,+919876543210,prospect,website,"interested,qualified",2024-01-15T10:30:00Z,2024-01-10T10:00:00Z
```

#### DELETE - Bulk delete
```bash
DELETE /api/admin/crm/leads/bulk
Content-Type: application/json

{
  "leadIds": ["id1", "id2", "id3"]
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "deletedCount": 3,
    "failedCount": 0
  }
}
```

---

### 3. Labels Management API
**Base**: `/api/admin/crm/labels`

#### GET - Fetch all labels with statistics
```bash
GET /api/admin/crm/labels?limit=50&skip=0
```

**Response**:
```json
{
  "success": true,
  "data": {
    "labels": [
      {
        "_id": "vip",
        "count": 45,
        "percentage": 30.5
      },
      {
        "_id": "interested",
        "count": 38,
        "percentage": 25.7
      },
      {
        "_id": "contacted",
        "count": 32,
        "percentage": 21.6
      }
    ],
    "total": 115,
    "limit": 50,
    "skip": 0
  }
}
```

#### POST - Add label to leads
```bash
POST /api/admin/crm/labels
Content-Type: application/json

{
  "label": "vip",
  "leadIds": ["id1", "id2", "id3"]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "label": "vip",
    "updatedCount": 3,
    "failedCount": 0
  }
}
```

#### DELETE - Remove label from all leads
```bash
DELETE /api/admin/crm/labels?label=vip
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "label": "vip",
    "removedFromCount": 45
  }
}
```

---

### 4. WhatsApp Messages API
**Base**: `/api/admin/crm/messages`

#### GET - Fetch messages
```bash
GET /api/admin/crm/messages?leadId=507f1f77bcf86cd799439011&status=sent&limit=20
```

**Query Parameters**:
- `leadId` (optional): Filter by lead
- `phoneNumber` (optional): Filter by phone number
- `status` (optional): `pending`, `sent`, `delivered`, `read`, `failed`
- `direction` (optional): `inbound` or `outbound`
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `limit` (optional): Max items (default: 50, max: 200)
- `skip` (optional): Pagination skip

**Response**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "leadId": "507f1f77bcf86cd799439011",
        "phoneNumber": "+919876543210",
        "message": "Hi John! How are you doing?",
        "type": "text",
        "status": "sent",
        "direction": "outbound",
        "sentAt": "2024-01-15T10:30:00Z",
        "deliveredAt": "2024-01-15T10:30:05Z",
        "readAt": null,
        "retryCount": 0
      }
    ],
    "total": 156,
    "limit": 20,
    "skip": 0
  }
}
```

#### POST - Send message
```bash
POST /api/admin/crm/messages
Content-Type: application/json

{
  "leadId": "507f1f77bcf86cd799439011",
  "message": "Hello! Are you interested in our yoga classes?",
  "type": "text"
}
```

**Message Types**:
- `text`: Plain text message
- `template`: Use predefined template
- `media`: Send image/video/document
- `interactive`: Buttons/list message

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "leadId": "507f1f77bcf86cd799439011",
    "phoneNumber": "+919876543210",
    "message": "Hello! Are you interested in our yoga classes?",
    "type": "text",
    "status": "pending",
    "direction": "outbound",
    "createdAt": "2024-01-15T10:31:00Z"
  }
}
```

#### PUT - Update message (retry/mark read)
```bash
PUT /api/admin/crm/messages
Content-Type: application/json

{
  "messageId": "507f1f77bcf86cd799439014",
  "action": "retry"
}
```

**Actions**:
- `retry`: Increment retry count and attempt resend
- `markAsRead`: Mark message as read

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "status": "sent",
    "retryCount": 1,
    "retryAt": "2024-01-15T10:32:00Z"
  }
}
```

#### DELETE - Delete message
```bash
DELETE /api/admin/crm/messages?messageId=507f1f77bcf86cd799439014
```

**Response** (200):
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

### 5. Sales Reporting API
**Base**: `/api/admin/crm/sales`

#### GET - Fetch sales with different views
```bash
GET /api/admin/crm/sales?view=list&startDate=2024-01-01&endDate=2024-01-31&limit=20
```

**Query Parameters**:
- `view` (optional): `list`, `summary`, `daily`, `monthly` (default: list)
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `userId` (optional): Filter by sales person
- `paymentMode` (optional): `payu`, `qr_code`, `manual`
- `limit` (optional): Max items (default: 20)
- `skip` (optional): Pagination

**View: list**
```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "_id": "507f1f77bcf86cd799439015",
        "userId": "507f1f77bcf86cd799439020",
        "leadId": "507f1f77bcf86cd799439011",
        "amount": 5000,
        "paymentMode": "payu",
        "status": "completed",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 45,
    "limit": 20,
    "skip": 0
  }
}
```

**View: summary**
```json
{
  "success": true,
  "data": {
    "totalSales": 45,
    "totalRevenue": 225000,
    "averageSaleAmount": 5000,
    "targetAchieved": 225000,
    "conversionCount": 32
  }
}
```

**View: daily**
```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "date": "2024-01-01",
        "count": 3,
        "total": 15000,
        "average": 5000
      },
      {
        "date": "2024-01-02",
        "count": 5,
        "total": 25000,
        "average": 5000
      }
    ]
  }
}
```

#### POST - Create sale
```bash
POST /api/admin/crm/sales
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439020",
  "leadId": "507f1f77bcf86cd799439011",
  "amount": 5000,
  "paymentMode": "payu"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "userId": "507f1f77bcf86cd799439020",
    "leadId": "507f1f77bcf86cd799439011",
    "amount": 5000,
    "paymentMode": "payu",
    "status": "completed",
    "createdAt": "2024-01-15T10:35:00Z"
  }
}
```

#### PUT - Update sale
```bash
PUT /api/admin/crm/sales
Content-Type: application/json

{
  "saleId": "507f1f77bcf86cd799439016",
  "amount": 5500,
  "status": "refunded"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "amount": 5500,
    "status": "refunded"
  }
}
```

#### DELETE - Delete sale
```bash
DELETE /api/admin/crm/sales?saleId=507f1f77bcf86cd799439016
```

**Response** (200):
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

### 6. Templates Management API
**Base**: `/api/admin/crm/templates`

#### GET - Fetch templates
```bash
GET /api/admin/crm/templates?category=greeting&status=approved&limit=20
```

**Query Parameters**:
- `category` (optional): Filter by category
- `status` (optional): `pending`, `approved`, `rejected`
- `limit` (optional): Max items (default: 50, max: 200)
- `skip` (optional): Pagination

**Response**:
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "_id": "507f1f77bcf86cd799439017",
        "templateName": "morning_greeting",
        "category": "greeting",
        "headerText": "Good Morning!",
        "bodyText": "Start your day with a rejuvenating yoga session.",
        "footerText": "Join us today",
        "status": "approved",
        "approvedAt": "2024-01-10T10:00:00Z",
        "createdAt": "2024-01-05T10:00:00Z"
      }
    ],
    "total": 15,
    "limit": 20,
    "skip": 0
  }
}
```

#### POST - Create template
```bash
POST /api/admin/crm/templates
Content-Type: application/json

{
  "templateName": "class_reminder",
  "category": "reminder",
  "headerText": "Class Reminder",
  "bodyText": "Your {{className}} class starts in {{minutes}} minutes.",
  "footerText": "See you soon!",
  "buttons": [
    { "text": "I'm coming", "action": "reply" },
    { "text": "Cancel", "action": "reply" }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "templateName": "class_reminder",
    "category": "reminder",
    "status": "pending",
    "createdBy": "507f1f77bcf86cd799439020",
    "createdAt": "2024-01-15T10:40:00Z"
  }
}
```

#### PUT - Update template
```bash
PUT /api/admin/crm/templates
Content-Type: application/json

{
  "templateId": "507f1f77bcf86cd799439018",
  "action": "approve"
}
```

**Actions**:
- `approve`: Mark as approved
- `reject`: Reject with reason
  ```json
  {
    "templateId": "...",
    "action": "reject",
    "rejectionReason": "Duplicate template exists"
  }
  ```
- Generic update: Update template fields

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "status": "approved",
    "approvedAt": "2024-01-15T10:41:00Z"
  }
}
```

#### DELETE - Delete template
```bash
DELETE /api/admin/crm/templates?templateId=507f1f77bcf86cd799439018
```

**Response** (200):
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

### 7. Consent Management API
**Base**: `/api/admin/crm/consent`

#### GET - Fetch consent records
```bash
GET /api/admin/crm/consent?status=opted_in&channel=whatsapp&limit=50
```

**Query Parameters**:
- `status` (optional): `opted_in`, `opted_out`, `pending`
- `channel` (optional): `whatsapp`, `sms`, `email`
- `limit` (optional): Max items (default: 50, max: 500)
- `skip` (optional): Pagination

**Response**:
```json
{
  "success": true,
  "data": {
    "consents": [
      {
        "_id": "507f1f77bcf86cd799439019",
        "phoneNumber": "+919876543210",
        "channel": "whatsapp",
        "status": "opted_in",
        "consentDate": "2024-01-10T10:00:00Z",
        "consentMethod": "sms_link",
        "createdAt": "2024-01-10T10:00:00Z"
      }
    ],
    "total": 1200,
    "limit": 50,
    "skip": 0,
    "stats": [
      { "_id": { "status": "opted_in", "channel": "whatsapp" }, "count": 850 },
      { "_id": { "status": "opted_out", "channel": "whatsapp" }, "count": 150 }
    ]
  }
}
```

#### POST - Create/Update consent
```bash
POST /api/admin/crm/consent
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "channel": "whatsapp",
  "status": "opted_in",
  "consentMethod": "sms_link"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "phoneNumber": "+919876543210",
    "channel": "whatsapp",
    "status": "opted_in",
    "consentDate": "2024-01-15T10:45:00Z",
    "consentMethod": "sms_link"
  }
}
```

#### PUT - Update consent status
```bash
PUT /api/admin/crm/consent
Content-Type: application/json

{
  "consentId": "507f1f77bcf86cd799439021",
  "action": "opt-out",
  "optOutKeyword": "STOP"
}
```

**Actions**:
- `opt-in`: Mark as opted in
- `opt-out`: Mark as opted out
- Generic update: Update any field

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "status": "opted_out",
    "optOutDate": "2024-01-15T10:46:00Z",
    "optOutKeyword": "STOP"
  }
}
```

#### DELETE - Delete consent record
```bash
DELETE /api/admin/crm/consent?consentId=507f1f77bcf86cd799439021
```

**Response** (200):
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

### 8. Analytics Dashboard API
**Base**: `/api/admin/crm/analytics`

#### GET - Fetch analytics
```bash
GET /api/admin/crm/analytics?view=overview&startDate=2024-01-01&endDate=2024-01-31
```

**Query Parameters**:
- `view` (optional): `overview`, `leads`, `sales`, `messages`, `conversion`, `trends`, or `all`
- `startDate` (optional): ISO date string (filters time-series data)
- `endDate` (optional): ISO date string

**View: overview**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalLeads": 450,
      "leadsByStatus": {
        "lead": 200,
        "prospect": 150,
        "customer": 80,
        "inactive": 20
      },
      "totalSales": 95,
      "totalMessages": 2340,
      "avgResponseTime": 4.2
    }
  }
}
```

**View: leads**
```json
{
  "success": true,
  "data": {
    "leads": {
      "totalLeads": 450,
      "newLeadsThisMonth": 45,
      "bySource": {
        "website": 150,
        "referral": 120,
        "social": 100,
        "event": 80
      },
      "byStage": {
        "awareness": 200,
        "consideration": 150,
        "decision": 100
      }
    }
  }
}
```

**View: sales**
```json
{
  "success": true,
  "data": {
    "sales": {
      "totalSales": 95,
      "totalRevenue": 475000,
      "avgSaleAmount": 5000,
      "byPaymentMode": {
        "payu": { "count": 60, "total": 300000 },
        "qr_code": { "count": 35, "total": 175000 }
      },
      "topPerformers": [
        { "userId": "id1", "salesCount": 15, "totalAmount": 75000 },
        { "userId": "id2", "salesCount": 12, "totalAmount": 60000 }
      ]
    }
  }
}
```

**View: messages**
```json
{
  "success": true,
  "data": {
    "messages": {
      "totalMessages": 2340,
      "inbound": 850,
      "outbound": 1490,
      "byStatus": {
        "sent": 1400,
        "delivered": 800,
        "read": 140
      },
      "avgRetryCount": 0.3
    }
  }
}
```

**View: conversion**
```json
{
  "success": true,
  "data": {
    "conversion": {
      "totalLeads": 450,
      "convertedLeads": 95,
      "conversionRate": 21.1,
      "avgDaysToConversion": 23,
      "bySource": {
        "website": 30,
        "referral": 35,
        "social": 20,
        "event": 10
      }
    }
  }
}
```

**View: trends**
```json
{
  "success": true,
  "data": {
    "trends": {
      "leadsPerDay": [
        { "date": "2024-01-01", "count": 5 },
        { "date": "2024-01-02", "count": 8 }
      ],
      "salesPerDay": [
        { "date": "2024-01-01", "count": 2, "total": 10000 },
        { "date": "2024-01-02", "count": 3, "total": 15000 }
      ],
      "messagesPerDay": [
        { "date": "2024-01-01", "count": 45 },
        { "date": "2024-01-02", "count": 52 }
      ]
    }
  }
}
```

---

### 9. Permissions & Roles API
**Base**: `/api/admin/crm/permissions`

#### GET - Fetch permissions and roles
```bash
GET /api/admin/crm/permissions?type=all&limit=50
```

**Query Parameters**:
- `type` (optional): `permissions`, `roles`, or `all`
- `roleId` (optional): Get specific role
- `limit` (optional): Max items (default: 50, max: 200)
- `skip` (optional): Pagination

**Response**:
```json
{
  "success": true,
  "data": {
    "permissions": {
      "items": [
        {
          "_id": "507f1f77bcf86cd799439022",
          "name": "view_leads",
          "displayName": "View Leads",
          "description": "Permission to view all leads",
          "createdAt": "2024-01-01T10:00:00Z"
        }
      ],
      "total": 15
    },
    "roles": {
      "items": [
        {
          "_id": "507f1f77bcf86cd799439023",
          "name": "admin",
          "displayName": "Administrator",
          "description": "Full system access",
          "permissions": [
            { "_id": "507f1f77bcf86cd799439022", "name": "view_leads" }
          ],
          "isDefault": true
        }
      ],
      "total": 4
    },
    "defaultRoles": [
      {
        "name": "admin",
        "permissions": [
          "view_leads",
          "create_leads",
          "edit_leads",
          "delete_leads",
          "view_sales",
          "create_sales",
          "edit_sales",
          "delete_sales",
          "send_messages",
          "view_messages",
          "view_analytics",
          "manage_templates",
          "manage_consent",
          "manage_users",
          "manage_permissions"
        ]
      },
      {
        "name": "manager",
        "permissions": [
          "view_leads",
          "create_leads",
          "edit_leads",
          "view_sales",
          "create_sales",
          "edit_sales",
          "send_messages",
          "view_messages",
          "view_analytics"
        ]
      },
      {
        "name": "sales_rep",
        "permissions": [
          "view_leads",
          "create_leads",
          "edit_leads",
          "view_sales",
          "create_sales",
          "send_messages",
          "view_messages"
        ]
      },
      {
        "name": "viewer",
        "permissions": [
          "view_leads",
          "view_sales",
          "view_messages",
          "view_analytics"
        ]
      }
    ]
  }
}
```

#### POST - Create permission or role
```bash
POST /api/admin/crm/permissions
Content-Type: application/json

{
  "resourceType": "permission",
  "name": "export_leads",
  "displayName": "Export Leads",
  "description": "Permission to export lead data"
}
```

**Create Role**:
```json
{
  "resourceType": "role",
  "name": "analyst",
  "displayName": "Analyst",
  "description": "Data analysis and reporting access",
  "permissionIds": ["507f1f77bcf86cd799439022", "507f1f77bcf86cd799439024"]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "name": "export_leads",
    "displayName": "Export Leads",
    "description": "Permission to export lead data",
    "createdAt": "2024-01-15T10:50:00Z"
  }
}
```

#### PUT - Update permission or role
```bash
PUT /api/admin/crm/permissions
Content-Type: application/json

{
  "resourceType": "role",
  "id": "507f1f77bcf86cd799439023",
  "displayName": "Super Administrator",
  "description": "Extended admin privileges",
  "permissionIds": ["507f1f77bcf86cd799439022", "507f1f77bcf86cd799439024", "507f1f77bcf86cd799439025"]
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439023",
    "name": "admin",
    "displayName": "Super Administrator",
    "permissions": [
      { "_id": "507f1f77bcf86cd799439022", "name": "view_leads" },
      { "_id": "507f1f77bcf86cd799439024", "name": "delete_leads" }
    ]
  }
}
```

#### DELETE - Delete permission or role
```bash
DELETE /api/admin/crm/permissions?resourceType=permission&id=507f1f77bcf86cd799439025
```

**Response** (200):
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

## Common Patterns

### Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error message describing what went wrong",
  "status": 400
}
```

**Common Status Codes**:
- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Server Error

### Pagination

Endpoints support pagination with `limit` and `skip` parameters:

```bash
GET /api/admin/crm/leads?limit=20&skip=40
# OR
GET /api/admin/crm/leads?page=3&limit=20
```

### Filtering

Most GET endpoints support query-based filtering:

```bash
# Multiple filters
GET /api/admin/crm/leads?status=prospect&source=website&tags=interested

# Date range filtering
GET /api/admin/crm/messages?startDate=2024-01-01&endDate=2024-01-31

# Search
GET /api/admin/crm/leads?search=john+doe
```

### Sorting

Results are sorted by most recent first (`createdAt` or `updatedAt`).

### Bulk Operations Pattern

For bulk operations, use dedicated endpoints:

```bash
POST /api/admin/crm/leads/bulk
{
  "action": "import|updateStatus|updateLabels",
  "data": { ... }
}
```

Response includes counts of processed, successful, and failed items.

---

## Integration Examples

### JavaScript/TypeScript

```typescript
const apiBase = 'http://localhost:3000/api/admin/crm';
const token = 'your-jwt-token';

// Fetch leads
async function getLeads() {
  const response = await fetch(`${apiBase}/leads?status=prospect&limit=20`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Send message
async function sendMessage(leadId: string, message: string) {
  const response = await fetch(`${apiBase}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      leadId,
      message,
      type: 'text'
    })
  });
  return response.json();
}

// Bulk import leads
async function importLeads(leads: any[]) {
  const response = await fetch(`${apiBase}/leads/bulk`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'import',
      leads
    })
  });
  return response.json();
}
```

### cURL

```bash
# Get leads
curl -H "Authorization: Bearer TOKEN" \
  'http://localhost:3000/api/admin/crm/leads?status=prospect&limit=20'

# Create lead
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","phoneNumber":"+919876543210"}' \
  'http://localhost:3000/api/admin/crm/leads'

# Send message
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"...", "message":"Hello!", "type":"text"}' \
  'http://localhost:3000/api/admin/crm/messages'
```

---

## Rate Limiting

API endpoints have rate limiting in place:
- Standard endpoints: 100 requests per minute per IP
- Bulk endpoints: 10 bulk operations per minute per IP
- Analytics endpoints: 30 requests per minute per IP

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642254000
```

---

## Best Practices

1. **Authenticate Early**: Always include Bearer token in Authorization header
2. **Validate Input**: Check required fields before sending requests
3. **Handle Errors**: Implement proper error handling for all status codes
4. **Use Pagination**: For large datasets, use pagination with appropriate limits
5. **Batch Operations**: Use bulk endpoints for multiple operations to reduce API calls
6. **Cache Results**: Cache read-only data (leads list, labels, templates) with appropriate TTL
7. **Monitor Rates**: Track rate limit headers to avoid hitting limits
8. **Log Transactions**: Log all API calls for audit trail and debugging

---

## Support & Debugging

For debugging API issues:

1. Check Authorization header format: `Authorization: Bearer <token>`
2. Verify JSON Content-Type header for POST/PUT requests
3. Validate date formats (ISO 8601: `2024-01-15T10:30:00Z`)
4. Check error messages in response body
5. Enable debug logs: `DEBUG=swar:* npm run dev`

For issues, refer to the CRM system logs or contact the development team.
