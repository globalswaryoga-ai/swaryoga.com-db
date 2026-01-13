# Email Automation - Quick Reference

## 🚀 Quick Start

### Send Email (API)
```typescript
POST /api/admin/crm/email/send
Authorization: Bearer {token}

{
  "recipients": [{ "email": "user@example.com", "name": "John" }],
  "subject": "Hello",
  "body": "Hi {name}!",
  "scheduleMode": "now"
}
```

### Create Template
```typescript
POST /api/admin/crm/email/templates
Authorization: Bearer {token}

{
  "name": "Welcome",
  "subject": "Welcome!",
  "body": "Hi {name}, welcome to {email}",
  "category": "welcome"
}
```

### Create Follow-Up
```typescript
POST /api/admin/crm/email/followups
Authorization: Bearer {token}

{
  "name": "New Lead Nurture",
  "trigger": "lead_created",
  "steps": [
    {
      "stepNumber": 1,
      "subject": "Welcome!",
      "body": "Hi {name}",
      "delayDays": 0,
      "delayHours": 1
    }
  ],
  "active": true
}
```

## 📁 File Locations

| Component | Path |
|-----------|------|
| Main Page | `app/admin/crm/email/page.tsx` |
| Components | `components/admin/email/EmailComponents.tsx` |
| Send API | `app/api/admin/crm/email/send/route.ts` |
| Templates API | `app/api/admin/crm/email/templates/` |
| Campaigns API | `app/api/admin/crm/email/campaigns/` |
| Follow-ups API | `app/api/admin/crm/email/followups/` |
| Schemas | `lib/schemas/enterpriseSchemas.ts` |
| Permissions | `lib/permissions.ts` |

## 🔑 Permissions

```typescript
permissionsV2.email.read          // View campaigns/analytics
permissionsV2.email.send          // Send individual emails
permissionsV2.email.broadcast     // Send bulk campaigns
permissionsV2.email.manageTemplates // Manage templates/sequences
```

## 📊 Database Models

```typescript
// Get models
import { 
  getEmailTemplate,
  getEmailCampaign,
  getFollowUpSequence,
  getFollowUpInstance 
} from '@/lib/schemas/enterpriseSchemas';

// Use models
const EmailTemplate = getEmailTemplate();
const templates = await EmailTemplate.find({ category: 'welcome' });
```

## 🔧 Integration Points

### Add Real Email Service
Edit: `app/api/admin/crm/email/send/route.ts`

```typescript
// Replace sendBulkEmails() function with:
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendBulkEmails(recipients, subject, body) {
  for (const recipient of recipients) {
    const personalizedBody = body
      .replace(/{name}/g, recipient.name)
      .replace(/{email}/g, recipient.email)
      .replace(/{phone}/g, recipient.phone);
    
    await sgMail.send({
      to: recipient.email,
      from: 'noreply@swaryoga.com',
      subject,
      html: personalizedBody,
    });
  }
}
```

### Add Follow-Up Scheduler
Create: `lib/cron/email-followups.ts`

```typescript
import cron from 'node-cron';
import { getFollowUpInstance } from '@/lib/schemas/enterpriseSchemas';

cron.schedule('*/10 * * * *', async () => {
  const Instance = getFollowUpInstance();
  const ready = await Instance.find({
    status: 'active',
    nextExecutionAt: { $lte: new Date() }
  });
  
  for (const instance of ready) {
    // Execute next step
    // Update instance
  }
});
```

## 🎨 UI Components

```typescript
// Import components
import {
  CampaignsTab,
  TemplatesTab,
  FollowupsTab,
  AnalyticsTab,
  TemplateModal,
  FollowupModal,
} from '@/components/admin/email/EmailComponents';

// Use in your page
<TemplatesTab
  templates={templates}
  onEdit={handleEdit}
  onDelete={handleDelete}
  canManageTemplates={true}
/>
```

## 🧪 Testing Commands

```bash
# Get templates
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/crm/email/templates

# Get campaigns
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/crm/email/campaigns

# Get follow-ups
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/crm/email/followups
```

## 🎯 Common Tasks

### Check Permissions
```typescript
import { hasPermission } from '@/lib/permissions';

const canSend = hasPermission(
  decoded?.permissionsV2, 
  'email', 
  'send'
);
```

### Handle API Errors
```typescript
import { apiError, apiSuccess } from '@/lib/api-error';

// Error
return apiError('FORBIDDEN', 'Custom message');

// Success
return apiSuccess({ data: 'value' });
```

### Variable Replacement
```typescript
const template = "Hi {name}, your email is {email}";
const recipient = { name: "John", email: "john@test.com" };

const personalized = template
  .replace(/{name}/g, recipient.name)
  .replace(/{email}/g, recipient.email);
// Result: "Hi John, your email is john@test.com"
```

## 📚 Documentation

- Full Guide: `EMAIL_AUTOMATION_GUIDE.md`
- Implementation: `EMAIL_AUTOMATION_IMPLEMENTATION.md`
- Permissions: `PERMISSION_SYSTEM_GUIDE.md`

## ⚡ Quick Debug

```typescript
// Check if models are accessible
import { getEmailTemplate } from '@/lib/schemas/enterpriseSchemas';
const EmailTemplate = getEmailTemplate();
console.log(EmailTemplate.modelName); // Should print "EmailTemplate"

// Check permissions
console.log(decoded?.permissionsV2?.email);
// Should show: { read: true, send: true, ... }

// Check database connection
import { connectDB } from '@/lib/db';
await connectDB();
console.log('Connected!');
```

## 🔥 Hot Tips

1. **Always call `connectDB()` before accessing models**
2. **Use getter functions** (`getEmailTemplate()`) not direct imports
3. **Check permissions** with `hasPermission()` in both API and UI
4. **Variables are case-sensitive**: `{name}` not `{Name}`
5. **Test with small recipient lists** before bulk sending
6. **Use `apiError('CODE', 'message')`** not raw `NextResponse.json()`

## 📞 Support

If you encounter issues:
1. Check `EMAIL_AUTOMATION_GUIDE.md` troubleshooting section
2. Verify permissions in database: `db.users.findOne({ username: 'admin' })`
3. Check API errors in browser console
4. Review server logs for detailed error messages
