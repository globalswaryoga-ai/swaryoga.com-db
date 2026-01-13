# Email Automation System - Complete Guide

## Overview
The Email Automation System provides a complete email marketing and follow-up solution with the same permission model as WhatsApp messaging. It includes templates, campaigns, analytics, and automated follow-up sequences.

## Architecture

### Database Schemas (lib/schemas/enterpriseSchemas.ts)

#### 1. EmailTemplate
Reusable email templates with variable substitution.

```typescript
{
  name: string;              // Unique template name
  subject: string;           // Email subject line
  body: string;              // Email body (supports HTML and variables)
  category: string;          // 'general', 'welcome', 'followup', 'workshop', 'custom'
  variables: string[];       // Available variables: ['name', 'email', 'phone']
  createdBy: string;         // Admin user who created it
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. EmailCampaign
Email campaign tracking with comprehensive statistics.

```typescript
{
  name: string;              // Campaign name
  subject: string;           // Email subject
  body: string;              // Email body
  templateId: ObjectId;      // Optional reference to EmailTemplate
  recipients: string[];      // Array of email addresses
  status: enum;              // 'draft', 'scheduled', 'sending', 'sent', 'failed'
  scheduledAt: Date;         // Optional scheduled send time
  sentAt: Date;              // Actual send timestamp
  stats: {
    total: number;           // Total recipients
    sent: number;            // Successfully sent
    delivered: number;       // Successfully delivered
    opened: number;          // Opened (requires tracking)
    clicked: number;         // Clicked links (requires tracking)
    bounced: number;         // Bounced emails
    unsubscribed: number;    // Unsubscribed
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. FollowUpSequence
Automated multi-step email sequences triggered by events.

```typescript
{
  name: string;              // Sequence name
  trigger: enum;             // 'manual', 'lead_created', 'workshop_registered', 
                             // 'payment_received', 'form_submitted', 'custom'
  steps: [{
    stepNumber: number;      // Sequential step number
    subject: string;         // Email subject
    body: string;            // Email body (supports variables)
    delayDays: number;       // Delay in days from trigger/previous step
    delayHours: number;      // Additional delay in hours
  }];
  active: boolean;           // Is sequence active?
  stats: {
    totalExecutions: number;      // Total times triggered
    completedExecutions: number;  // Fully completed sequences
    activeExecutions: number;     // Currently in progress
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. FollowUpInstance
Tracks individual execution of a follow-up sequence for a lead.

```typescript
{
  sequenceId: ObjectId;      // Reference to FollowUpSequence
  leadId: ObjectId;          // Reference to Lead
  currentStep: number;       // Current step being executed (0-based)
  status: enum;              // 'active', 'completed', 'paused', 'failed'
  executedSteps: number[];   // Array of completed step numbers
  nextExecutionAt: Date;     // When next step should execute
  triggeredAt: Date;         // When sequence was triggered
  completedAt: Date;         // When sequence completed (if status = completed)
  createdAt: Date;
  updatedAt: Date;
}
```

## Permission System

### Email Module Permissions
The email system uses the same permissionsV2 structure as WhatsApp:

```typescript
permissionsV2: {
  email: {
    read: boolean;           // View campaigns, templates, analytics
    send: boolean;           // Send individual emails
    broadcast: boolean;      // Send bulk email campaigns
    manageTemplates: boolean; // Create/edit/delete templates and sequences
  }
}
```

### Permission Checks
All API endpoints verify permissions using `hasPermission()`:

```typescript
import { hasPermission } from '@/lib/permissions';

// Example: Check if user can send emails
if (!hasPermission(decoded?.permissionsV2, 'email', 'send')) {
  return apiError('FORBIDDEN', 'You do not have permission to send emails');
}
```

## API Endpoints

### Templates

#### GET /api/admin/crm/email/templates
List all email templates with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [...],
    "count": 10
  }
}
```

**Required Permission:** `email.manageTemplates`

#### POST /api/admin/crm/email/templates
Create a new email template.

**Request Body:**
```json
{
  "name": "Welcome Email",
  "subject": "Welcome to Swar Yoga!",
  "body": "Hi {name}, welcome to our community...",
  "category": "welcome",
  "variables": ["name", "email"]
}
```

**Required Permission:** `email.manageTemplates`

#### PUT /api/admin/crm/email/templates/[id]
Update an existing template.

**Required Permission:** `email.manageTemplates`

#### DELETE /api/admin/crm/email/templates/[id]
Delete a template.

**Required Permission:** `email.manageTemplates`

### Campaigns

#### GET /api/admin/crm/email/campaigns
List all email campaigns.

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Results per page (default: 50)
- `skip` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": [...],
    "pagination": {
      "total": 100,
      "limit": 50,
      "skip": 0,
      "hasMore": true
    }
  }
}
```

**Required Permission:** `email.read`

#### POST /api/admin/crm/email/send
Send an email campaign.

**Request Body:**
```json
{
  "recipients": [
    { "email": "user@example.com", "name": "User Name", "phone": "1234567890" }
  ],
  "subject": "Your Subject",
  "body": "Email body with {name} variable",
  "templateId": "template_id_here",  // optional
  "scheduleMode": "now",  // or "later"
  "scheduledAt": "2025-01-10T10:00:00Z"  // required if scheduleMode = "later"
}
```

**Required Permission:** `email.send` (for individual) or `email.broadcast` (for bulk)

#### POST /api/admin/crm/email/campaigns/[id]/retry
Retry a failed campaign.

**Required Permission:** `email.send`

### Follow-Up Sequences

#### GET /api/admin/crm/email/followups
List all follow-up sequences.

**Query Parameters:**
- `active` (optional): Filter by active status ("true" or "false")

**Required Permission:** `email.read`

#### POST /api/admin/crm/email/followups
Create a new follow-up sequence.

**Request Body:**
```json
{
  "name": "New Lead Nurture",
  "trigger": "lead_created",
  "steps": [
    {
      "stepNumber": 1,
      "subject": "Welcome!",
      "body": "Hi {name}, thanks for joining...",
      "delayDays": 0,
      "delayHours": 1
    },
    {
      "stepNumber": 2,
      "subject": "Here's what's next",
      "body": "Follow up content...",
      "delayDays": 3,
      "delayHours": 0
    }
  ],
  "active": true
}
```

**Required Permission:** `email.manageTemplates`

#### PUT /api/admin/crm/email/followups/[id]
Update a follow-up sequence.

**Required Permission:** `email.manageTemplates`

#### DELETE /api/admin/crm/email/followups/[id]
Delete a follow-up sequence.

**Required Permission:** `email.manageTemplates`

#### POST /api/admin/crm/email/followups/[id]/toggle
Activate or deactivate a sequence.

**Required Permission:** `email.manageTemplates`

## Frontend Components

### Main Email Page
**Path:** `app/admin/crm/email/page.tsx`

The main email automation interface with 5 tabs:

1. **Compose Tab**: Send emails with recipient selection, scheduling
2. **Campaigns Tab**: View campaign history with stats and retry
3. **Templates Tab**: Manage reusable email templates
4. **Follow-ups Tab**: Create and manage automated sequences
5. **Analytics Tab**: View aggregate email statistics

### Component Library
**Path:** `components/admin/email/EmailComponents.tsx`

Reusable components:
- `CampaignsTab`: Display campaigns with status badges
- `TemplatesTab`: Template CRUD interface
- `FollowupsTab`: Sequence management
- `AnalyticsTab`: Statistics dashboard
- `TemplateModal`: Create/edit templates
- `FollowupModal`: Create/edit sequences
- `StatusBadge`: Campaign status indicators
- `StatCard`: Statistic display cards

## Variable Substitution

The system supports automatic variable replacement in email bodies:

- `{name}`: Recipient's name
- `{email}`: Recipient's email
- `{phone}`: Recipient's phone number

**Example:**
```
Template: "Hi {name}, your email is {email}"
Sent to: { name: "John", email: "john@example.com" }
Result: "Hi John, your email is john@example.com"
```

## Follow-Up Automation

### How Follow-Ups Work

1. **Create Sequence**: Define trigger and steps with delays
2. **Trigger Event**: When event occurs (e.g., lead_created), create FollowUpInstance
3. **Execute Steps**: Background job checks nextExecutionAt and sends emails
4. **Track Progress**: Instance tracks currentStep and executedSteps
5. **Complete**: When all steps executed, mark status as 'completed'

### Example Flow

```
Lead Created (trigger)
  ↓
Create FollowUpInstance
  ↓
Step 1: Send immediately (delay: 0 days, 1 hour)
  nextExecutionAt = now + 1 hour
  ↓
Background Job: Send Step 1
  currentStep = 1
  executedSteps = [1]
  nextExecutionAt = now + 3 days
  ↓
Background Job: Send Step 2 (after 3 days)
  currentStep = 2
  executedSteps = [1, 2]
  status = 'completed'
```

## Email Service Integration

### Current Status
The system currently uses placeholder email sending. To integrate a real email service:

### Option 1: SendGrid
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  await sgMail.send({
    to,
    from: 'noreply@swaryoga.com',
    subject,
    html,
  });
}
```

### Option 2: AWS SES
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-east-1' });

async function sendEmail(to: string, subject: string, html: string) {
  await ses.send(new SendEmailCommand({
    Source: 'noreply@swaryoga.com',
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  }));
}
```

### Option 3: Nodemailer (SMTP)
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: 'noreply@swaryoga.com',
    to,
    subject,
    html,
  });
}
```

## Background Job for Follow-Ups

To execute follow-up sequences automatically, create a cron job:

### Example: Node Cron
```typescript
// lib/cron/email-followups.ts
import cron from 'node-cron';
import { connectDB } from '@/lib/db';
import { getFollowUpInstance, getFollowUpSequence } from '@/lib/schemas/enterpriseSchemas';

export function startFollowUpScheduler() {
  // Run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await connectDB();
    const FollowUpInstance = getFollowUpInstance();
    const FollowUpSequence = getFollowUpSequence();

    // Find instances ready for next step
    const instances = await FollowUpInstance.find({
      status: 'active',
      nextExecutionAt: { $lte: new Date() },
    });

    for (const instance of instances) {
      const sequence = await FollowUpSequence.findById(instance.sequenceId);
      if (!sequence || !sequence.active) continue;

      const nextStep = sequence.steps[instance.currentStep];
      if (!nextStep) {
        // Sequence complete
        instance.status = 'completed';
        instance.completedAt = new Date();
        await instance.save();
        continue;
      }

      // Send email for this step
      // TODO: Get lead email and send
      // await sendEmail(lead.email, nextStep.subject, nextStep.body);

      // Update instance
      instance.executedSteps.push(nextStep.stepNumber);
      instance.currentStep++;

      const hasMoreSteps = instance.currentStep < sequence.steps.length;
      if (hasMoreSteps) {
        const next = sequence.steps[instance.currentStep];
        const delayMs = (next.delayDays * 24 * 60 + next.delayHours * 60) * 60 * 1000;
        instance.nextExecutionAt = new Date(Date.now() + delayMs);
      } else {
        instance.status = 'completed';
        instance.completedAt = new Date();
      }

      await instance.save();
    }
  });
}
```

## Security Considerations

### Permission Verification
All endpoints verify:
1. Admin authentication (`decoded?.isAdmin`)
2. Specific email permissions using `hasPermission()`

### Input Validation
- Template names must be unique
- Email addresses validated (TODO: add email regex)
- Follow-up steps must have valid delays
- Campaign recipients must be non-empty array

### Rate Limiting
Consider implementing rate limits for bulk email sending:
```typescript
// Example rate limit: 100 emails per hour per user
const rateLimit = new Map<string, { count: number; resetAt: Date }>();
```

## Testing

### Manual Testing Checklist
- [ ] Create email template with variables
- [ ] Send test email using template
- [ ] Schedule email for later
- [ ] View campaign stats
- [ ] Retry failed campaign
- [ ] Create follow-up sequence
- [ ] Activate/deactivate sequence
- [ ] Test permission restrictions
- [ ] Verify variable substitution

### API Testing with cURL
```bash
# Get all templates
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/crm/email/templates

# Create template
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","subject":"Hi","body":"Hello {name}"}' \
  http://localhost:3000/api/admin/crm/email/templates

# Send email
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipients":[{"email":"test@test.com","name":"Test"}],"subject":"Hi","body":"Hello"}' \
  http://localhost:3000/api/admin/crm/email/send
```

## Future Enhancements

1. **Email Tracking**: Track opens and clicks using pixel/link tracking
2. **A/B Testing**: Test different subject lines and content
3. **Unsubscribe Management**: Handle unsubscribe requests
4. **Bounce Handling**: Process bounce notifications
5. **Email Verification**: Verify email addresses before sending
6. **Rich Text Editor**: WYSIWYG editor for email composition
7. **Template Library**: Pre-built template gallery
8. **Advanced Scheduling**: Timezone-aware scheduling, send-time optimization
9. **Segmentation**: Dynamic recipient lists based on lead attributes
10. **Reporting**: Detailed analytics dashboard with charts

## Troubleshooting

### Issue: Emails not sending
- Check email service credentials in `.env.local`
- Verify `sendBulkEmails()` is implemented with real email service
- Check campaign status (should be 'sending' not 'draft')

### Issue: Permission denied
- Verify user has correct `permissionsV2.email` permissions
- Check JWT token contains `permissionsV2` field
- Ensure `TokenPayload` interface includes `permissionsV2`

### Issue: Follow-ups not executing
- Verify cron job is running
- Check `nextExecutionAt` dates in FollowUpInstance
- Ensure sequence is active (`active: true`)
- Check sequence has valid steps

### Issue: Variables not replacing
- Verify variable names match exactly: `{name}`, `{email}`, `{phone}`
- Check recipient data includes these fields
- Review `sendBulkEmails()` replacement logic

## Summary

The Email Automation System provides:
✅ Template management with variable substitution
✅ Campaign tracking with comprehensive statistics
✅ Automated follow-up sequences with multiple steps
✅ Permission-based access control matching WhatsApp
✅ Complete CRUD API endpoints
✅ Modern React UI with 5 functional tabs
✅ Ready for email service integration (SendGrid/AWS SES/Nodemailer)
✅ Scalable architecture with background job support

**Next Steps:**
1. Integrate real email service (SendGrid recommended)
2. Implement follow-up execution cron job
3. Add email tracking (opens/clicks)
4. Deploy and test in production environment
