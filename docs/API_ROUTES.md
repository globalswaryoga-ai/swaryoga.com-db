# 📋 Enterprise Features - Complete API Routes Documentation

**Total Routes:** 68 API endpoints  
**Feature Areas:** 10  
**Development Status:** Planning phase

---

## 📑 API Routes Breakdown

### 1️⃣ WHATSAPP MESSAGING ROUTES (8 endpoints)

#### Send Messages
```
POST   /api/whatsapp/send                    - Send single WhatsApp message
POST   /api/whatsapp/bulk-send               - Send bulk messages to leads
POST   /api/whatsapp/schedule                - Schedule message for later
```

#### Message Management
```
GET    /api/whatsapp/messages                - Get all messages (paginated, filtered)
GET    /api/whatsapp/messages/:messageId     - Get single message details
PUT    /api/whatsapp/messages/:messageId     - Update message status/metadata
DELETE /api/whatsapp/messages/:messageId     - Delete message
```

#### Message Status
```
GET    /api/whatsapp/messages/:messageId/status - Get detailed status
```

---

### 2️⃣ RATE LIMIT MANAGEMENT ROUTES (6 endpoints)

```
GET    /api/whatsapp/rate-limit              - Get current rate limit status
GET    /api/whatsapp/rate-limit/status       - Check if paused
POST   /api/whatsapp/rate-limit/pause        - Pause messaging (admin only)
POST   /api/whatsapp/rate-limit/resume       - Resume messaging (admin only)
GET    /api/whatsapp/rate-limit/history      - View limit history
POST   /api/whatsapp/rate-limit/alert        - Send admin alert
```

---

### 3️⃣ COMPLIANCE & CONSENT ROUTES (7 endpoints)

#### Consent Management
```
POST   /api/compliance/consent               - Create/update user consent
GET    /api/compliance/consent/:phoneNumber  - Get consent status
GET    /api/compliance/consent/user/:userId  - Get all consents for user
```

#### Opt-out Handling
```
POST   /api/compliance/unsubscribe           - Handle STOP/UNSUBSCRIBE keyword
POST   /api/compliance/opt-out               - Manually opt-out user
PUT    /api/compliance/re-consent            - Re-opt user after period
DELETE /api/compliance/consent/:phoneNumber  - Delete consent record
```

---

### 4️⃣ MESSAGE DELIVERY TRACKING ROUTES (5 endpoints)

```
GET    /api/whatsapp/delivery                - Get delivery reports
GET    /api/whatsapp/delivery/:messageId     - Get message delivery status
POST   /api/whatsapp/delivery/webhook        - Meta webhook (incoming updates)
POST   /api/messages/retry                   - Retry failed messages
PUT    /api/messages/retry/:messageId        - Manual resend option
```

---

### 5️⃣ AUDIT LOG ROUTES (4 endpoints)

```
GET    /api/audit/logs                       - Get all audit logs (admin only)
GET    /api/audit/logs/:userId               - Get user-specific logs
GET    /api/audit/logs/action/:actionType    - Filter logs by action type
POST   /api/audit/logs                       - Create audit log entry
```

---

### 6️⃣ WHATSAPP TEMPLATE ROUTES (8 endpoints)

#### Template Management
```
POST   /api/templates                        - Create new template
GET    /api/templates                        - Get all templates
GET    /api/templates/:templateId            - Get template details
PUT    /api/templates/:templateId            - Update template
DELETE /api/templates/:templateId            - Delete template
```

#### Template Approval
```
POST   /api/templates/:templateId/approve    - Approve template (admin)
POST   /api/templates/:templateId/reject     - Reject template (admin)
GET    /api/templates/status/:templateId     - Get approval status
```

---

### 7️⃣ BACKUP & RESTORE ROUTES (5 endpoints)

```
POST   /api/backup                           - Trigger manual backup (admin)
GET    /api/backup                           - Get backup history
GET    /api/backup/:backupId                 - Get backup details
POST   /api/backup/:backupId/restore         - Restore from backup (admin)
POST   /api/backup/schedule                  - Configure auto-backup schedule
```

---

### 8️⃣ PERMISSION ROUTES (6 endpoints)

#### Permission Management
```
POST   /api/permissions                      - Create permission set
GET    /api/permissions/:userId              - Get user permissions
PUT    /api/permissions/:userId              - Update user permissions
DELETE /api/permissions/:userId              - Revoke permissions
```

#### Role Management
```
GET    /api/permissions/roles                - Get all available roles
POST   /api/permissions/assign               - Assign role to user
```

---

### 9️⃣ ANALYTICS ROUTES (10 endpoints)

#### Lead Analytics
```
GET    /api/analytics/leads                  - Lead count by source/stage
GET    /api/analytics/leads/conversion       - Lead conversion rates
GET    /api/analytics/leads/funnel           - Funnel stage breakdown
GET    /api/analytics/leads/attribution      - Lead attribution data
```

#### WhatsApp Analytics
```
GET    /api/analytics/whatsapp               - Message metrics (sent/delivered)
GET    /api/analytics/whatsapp/delivery      - Delivery rate analytics
GET    /api/analytics/whatsapp/engagement    - Read rate, response rate
GET    /api/analytics/whatsapp/timeline      - Message timeline
```

#### Sales Analytics
```
GET    /api/analytics/sales                  - Overall sales metrics
GET    /api/analytics/sales/user             - Sales by user/rep
```

---

### 🔟 SALES REPORTING ROUTES (9 endpoints)

#### Sales Reports
```
GET    /api/reports/sales                    - Get sales report (date range)
GET    /api/reports/sales/user               - Sales per user
GET    /api/reports/sales/monthly            - Monthly sales breakdown
GET    /api/reports/sales/quarterly          - Quarterly sales
GET    /api/reports/sales/yearly             - Yearly sales
```

#### Export & Reporting
```
GET    /api/reports/export/csv               - Export sales as CSV
GET    /api/reports/export/excel             - Export sales as Excel
GET    /api/reports/export/pdf               - Export sales as PDF
POST   /api/reports/schedule                 - Schedule automated reports
```

---

## 📊 API Routes by Method

### POST (Create/Action) - 24 endpoints
```
Messaging (3), Rate Limit (2), Compliance (2), Tracking (1), 
Audit (1), Templates (2), Backup (2), Permissions (2), Reports (1), 
Others (5)
```

### GET (Retrieve) - 38 endpoints
```
Messaging (2), Rate Limit (3), Compliance (1), Tracking (1), 
Audit (3), Templates (1), Backup (2), Permissions (1), 
Analytics (10), Reports (9), Others (5)
```

### PUT (Update) - 5 endpoints
```
Messaging (1), Compliance (1), Permissions (1), Others (2)
```

### DELETE (Remove) - 2 endpoints
```
Messaging (1), Compliance (1)
```

---

## 🔐 Authentication & Authorization

**All routes require:**
- ✅ Valid JWT token in `Authorization: Bearer <token>` header
- ✅ User role verification via `Permission` schema
- ✅ Resource ownership verification (can't access others' data)

**Admin-only routes:**
- Rate limit pause/resume
- Template approval/rejection
- Backup/restore operations
- View all audit logs
- User permission management

---

## 📝 Request/Response Format

### Standard Success Response
```json
{
  "success": true,
  "data": { /* endpoint specific */ },
  "message": "Operation successful"
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* optional debug info */ }
}
```

---

## 🔄 Query Parameters (Pagination & Filtering)

**Standard pagination:**
```
?page=1&limit=20&sort=-createdAt
```

**Common filters:**
```
?status=delivered&dateFrom=2025-01-01&dateTo=2025-12-31
?userId=xxx&actionType=message_send
?paymentMode=payu&conversionOnly=true
```

---

## 📦 Implementation Status

| Feature | Routes | Status | Estimated Time |
|---------|--------|--------|-----------------|
| Messaging | 8 | Ready | Week 1 |
| Rate Limit | 6 | Ready | Week 1 |
| Compliance | 7 | Ready | Week 2 |
| Delivery | 5 | Ready | Week 2 |
| Audit | 4 | Ready | Week 1 |
| Templates | 8 | Ready | Week 2 |
| Backup | 5 | Ready | Week 3 |
| Permissions | 6 | Ready | Week 1 |
| Analytics | 10 | Ready | Week 3 |
| Reports | 9 | Ready | Week 3 |
| **Total** | **68** | **Planning** | **3 weeks** |

---

## 🎯 Phase-wise Route Implementation

### Phase 1 (Week 1): Core Infrastructure
- Authentication & Permission routes
- Audit logging routes
- Basic messaging routes

### Phase 2 (Week 2): Compliance & Quality
- Compliance & consent routes
- Message delivery tracking
- Template management

### Phase 3 (Week 3): Advanced Features
- Backup & restore routes
- Analytics routes
- Sales reporting routes
- Rate limiting integration

### Phase 4: Integration & Testing
- API integration testing
- End-to-end testing
- Performance optimization

### Phase 5: Deployment
- Staging deployment
- Production deployment
- Monitoring setup

---

## 🚀 Getting Started

1. ✅ Schemas defined: `/lib/schemas/enterpriseSchemas.ts`
2. ⏳ Middleware utilities: Next step
3. ⏳ API route handlers: Following
4. ⏳ Frontend integration: Phase 4

**Next:** Generate Phase-wise Development Plan & Starter Code Structure

