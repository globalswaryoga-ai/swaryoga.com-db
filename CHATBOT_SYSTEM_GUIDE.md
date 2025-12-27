# Chatbot System - Complete Guide

## Overview
The Swar Yoga chatbot system is a complete WhatsApp automation platform integrated into the CRM dashboard. It allows you to create conversational flows, manage settings, and automate customer interactions.

## Architecture

### Core Components

1. **Chatbot Builder** (`/admin/crm/chatbot-builder`)
   - Visual flow builder for creating chatbot conversation paths
   - Node types: Questions, Buttons, Templates, Conditions, Timers
   - Drag-and-drop interface for designing flows
   - Test mode for previewing conversations

2. **Chatbot Settings** (`/admin/crm/chatbot-settings`)
   - Global configuration for all chatbot behavior
   - Welcome messages, office hours, escalation rules
   - Inactivity timeouts and fallback responses

3. **Database Models**
   - `ChatbotFlow`: Stores the conversation flow structure
   - `ChatbotStep`: Individual steps/nodes in a flow
   - `ChatbotSettings`: Global configuration
   - `ChatbotVariable`: Dynamic values in conversations

## Features

### Chatbot Builder

#### Flow Creation
Create conversation flows by adding steps:

1. **Start Node** - Entry point (auto-created)
2. **Question Node**
   - Display text to user
   - Wait for user response
   - Classify responses to route to different branches
   - Support regex matching and keyword detection

3. **Button Node**
   - Show quick reply buttons (max 10)
   - Route to different steps based on button clicked
   - Track button clicks as conversions

4. **Template Node**
   - Use pre-built message templates
   - Support template variables `{{variable}}`
   - Quick access to common messages

5. **Condition Node**
   - Branch flow based on user properties or previous responses
   - Conditions: user status, lead source, conversation variables
   - Multiple branches with fallback

6. **Timer Node**
   - Set delays between messages
   - Useful for dramatic effect or thinking time
   - 1-60 seconds

7. **Webhook Node**
   - Call external APIs
   - Pass user data and conversation context
   - Handle webhook responses

#### Step Configuration

```typescript
interface ChatbotStep {
  _id: ObjectId;
  flowId: ObjectId;
  stepNumber: number;
  type: 'start' | 'question' | 'button' | 'template' | 'condition' | 'timer' | 'webhook' | 'end';
  
  // Question Node
  question?: string;
  answers?: Array<{
    pattern: string; // regex or keyword
    nextStepId: ObjectId;
  }>;
  
  // Button Node
  message?: string;
  buttons?: Array<{
    label: string;
    nextStepId: ObjectId;
  }>;
  
  // Template Node
  templateId?: ObjectId;
  variables?: Record<string, string>;
  
  // Condition Node
  conditions?: Array<{
    rule: string; // JavaScript expression
    nextStepId: ObjectId;
  }>;
  defaultNextStepId?: ObjectId;
  
  // Timer Node
  delaySeconds?: number;
  nextStepId?: ObjectId;
  
  // Webhook Node
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST';
  nextStepId?: ObjectId;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Chatbot Settings

Configure global behavior:

```typescript
interface ChatbotSettings {
  // Welcome Message
  welcomeEnabled: boolean;
  welcomeMessage: string;
  
  // Office Hours
  officeHoursEnabled: boolean;
  officeHoursStart: string; // "09:00"
  officeHoursEnd: string;   // "18:00"
  officeHoursTimezone: string; // "Asia/Kolkata"
  afterHoursMessage: string;
  
  // Escalation
  escalateAfterMessages: number; // escalate to human after N messages
  escalateMessage: string; // "Let me connect you with our team..."
  
  // Inactivity
  inactivityMinutes: number;
  inactivityMessage: string; // "I'll be here when you need help!"
  
  // Global Settings
  defaultResponse: string; // for unmatched input
  globalLabels: string[];
  aiEnabled: boolean; // Use AI for unmatched queries
}
```

## API Endpoints

### Chatbot Builder

#### `GET /api/admin/crm/chatbot-flows`
List all flows

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Workshop Inquiry",
      "description": "Handle workshop questions",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/admin/crm/chatbot-flows`
Create new flow

**Body:**
```json
{
  "name": "Workshop Inquiry",
  "description": "Handle workshop questions",
  "triggers": ["workshop"]
}
```

#### `GET /api/admin/crm/chatbot-flows/:id`
Get flow with all steps

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Workshop Inquiry",
    "steps": [
      {
        "_id": "...",
        "type": "start",
        "nextStepId": "..."
      },
      {
        "_id": "...",
        "type": "question",
        "question": "Which workshop interests you?",
        "answers": [...]
      }
    ]
  }
}
```

#### `PUT /api/admin/crm/chatbot-flows/:id`
Update flow

#### `DELETE /api/admin/crm/chatbot-flows/:id`
Delete flow

#### `POST /api/admin/crm/chatbot-flows/:id/steps`
Add step to flow

**Body:**
```json
{
  "type": "question",
  "question": "What's your question?",
  "answers": [
    {
      "pattern": "pricing|cost|fee",
      "nextStepId": "..."
    }
  ]
}
```

#### `PUT /api/admin/crm/chatbot-flows/:flowId/steps/:stepId`
Update step

#### `DELETE /api/admin/crm/chatbot-flows/:flowId/steps/:stepId`
Delete step

### Chatbot Settings

#### `GET /api/admin/crm/chatbot-settings`
Get current settings

**Response:**
```json
{
  "success": true,
  "data": {
    "welcomeEnabled": true,
    "welcomeMessage": "Welcome to Swar Yoga!"
  }
}
```

#### `PUT /api/admin/crm/chatbot-settings`
Update settings

**Body:** Any ChatbotSettings fields to update

## Integration with WhatsApp

### Message Processing Flow

1. **Inbound Message** arrives from WhatsApp
2. **Lead Lookup** - Find or create lead from phone number
3. **Context Detection** - Check if user mentioned a keyword (workshop, course, etc.)
4. **Flow Matching** - Find active flow based on keyword triggers
5. **Step Execution** - Run chatbot step (question, button, template, etc.)
6. **Response Routing** - Send response and determine next step
7. **Conversation State** - Save current step in conversation session
8. **Rules Application** - Check office hours, escalation, inactivity

### WhatsApp Integration Code

In `lib/db.ts`, the WhatsApp message handler:

```typescript
// 1. Save incoming message
const message = await WhatsAppMessage.create({
  leadId,
  direction: 'inbound',
  content: userMessage,
  status: 'received',
});

// 2. Get active conversation
let conversation = await ChatbotConversation.findOne({
  leadId,
  endedAt: null,
});

if (!conversation) {
  conversation = await ChatbotConversation.create({
    leadId,
    startedAt: new Date(),
    steps: [],
  });
}

// 3. Find next step in flow
const currentStep = conversation.currentStepId;
const flow = await ChatbotFlow.findById(conversation.flowId);

// 4. Execute step (evaluate conditions, extract data, etc.)
// 5. Send response via WhatsApp API
```

## Usage Examples

### Example 1: Workshop Inquiry Flow

**Steps:**
1. **Start** → "Hi! 👋 Are you interested in yoga workshops?"
2. **Buttons** → [Yes, No, Tell me more]
   - Yes → Proceed to workshop details
   - No → "No problem! Reach out anytime."
   - Tell me more → Send info
3. **Question** → "Which style interests you? (Hatha, Vinyasa, etc.)"
4. **Condition** → Check if user is existing customer
   - Existing → Send special offer
   - New → Send standard pricing
5. **End** → "Our team will contact you soon!"

### Example 2: Office Hours Routing

**Settings:**
- Office Hours: 9 AM - 6 PM (Asia/Kolkata)
- After Hours Message: "We're closed! Message us and we'll reply in the morning."

**Flow:**
1. Check office hours in incoming message handler
2. If outside hours, send after-hours message
3. Save conversation state for morning follow-up
4. Next morning, send: "Good morning! Can I help you?"

### Example 3: Escalation Flow

**Settings:**
- Escalate after 3 messages
- Escalation Message: "Let me connect you with our team for personalized help!"

**Flow:**
1. Track message count in conversation
2. After 3 messages, check if issue resolved
3. If not resolved, transfer to human with context
4. Mark conversation as "escalated"

## Testing Your Flows

### Test Mode in Builder
1. Go to `/admin/crm/chatbot-builder`
2. Open a flow
3. Click "Test Flow"
4. Chat with the bot in test environment
5. Verify buttons, questions, and routing work correctly

### Debug Mode
Set `DEBUG_CHATBOT=1` in `.env.local`:
```bash
DEBUG_CHATBOT=1 npm run dev
```

This logs:
- Step execution
- Response generation
- Variable substitution
- Condition evaluation
- WhatsApp API calls

## Advanced Features

### Variables and Context

Use variables in messages:
```
Hello {{firstName}}, welcome to {{businessName}}!
```

Variables come from:
- Lead data: `{{firstName}}`, `{{email}}`, `{{phone}}`
- Conversation context: `{{lastResponse}}`, `{{topic}}`
- Custom tracking: Set via flow steps

### Conditional Logic

Create branches based on:
- Lead status: `{{ status == 'customer' }}`
- Lead source: `{{ source == 'website' }}`
- Custom attributes: `{{ metadata.language == 'Hindi' }}`
- Previous responses: `{{ previousResponses.includes('pricing') }}`

### Template Variables

Define templates in `/admin/crm/templates`:
```
Welcome Template:
  "Hi {{firstName}}, welcome to Swar Yoga! 🙏"

Pricing Template:
  "Regular Classes: ₹{{pricing.monthly}}/month
   Special Offer: {{pricing.discount}}% off for new members"
```

Use in flows:
```
Step: Template
- Template: "Welcome Template"
- Variables: { firstName: "John" }
```

## Performance Optimization

### Caching
- Flow definitions are cached in memory
- Settings cached with 5-min TTL
- Lead context cached during conversation

### Database Indexes
```typescript
// ChatbotFlow
db.chatbot_flows.createIndex({ createdByUserId: 1 });
db.chatbot_flows.createIndex({ status: 1 });

// ChatbotConversation
db.chatbot_conversations.createIndex({ leadId: 1, endedAt: 1 });
db.chatbot_conversations.createIndex({ flowId: 1, createdAt: -1 });

// ChatbotStep
db.chatbot_steps.createIndex({ flowId: 1, stepNumber: 1 });
```

## Troubleshooting

### Issue: Flow not triggering

**Check:**
1. Is flow status "active"?
2. Are triggers set correctly?
3. Does the user message match a trigger keyword?

### Issue: Variables not substituting

**Check:**
1. Is variable name spelled correctly?
2. Does lead have that data?
3. Use debug mode to see variable resolution

### Issue: Buttons not clickable

**Check:**
1. Are button labels under 20 characters?
2. Is the button message under 1024 characters?
3. Are you using allowed button names?

### Issue: Message not sending

**Check:**
1. Is lead's phone number valid?
2. Is WhatsApp API token active?
3. Check API rate limits
4. Review CloudAPI logs

## Best Practices

1. **Keep flows simple** - 3-5 steps max before escalation
2. **Use variables** - Personalize messages with lead data
3. **Test thoroughly** - Use test mode before going live
4. **Monitor conversations** - Review failed/escalated chats
5. **Update office hours** - Keeps customers informed
6. **Use templates** - Ensures consistency, reduces errors
7. **Set escalation** - Don't let customers wait indefinitely
8. **Track metrics** - Monitor success rate, response time

## API Rate Limits

- Flows: 100 per minute
- Settings: 50 per minute
- Conversation creation: 1000 per minute (WhatsApp only)
- Step execution: 10000 per minute

## Common Workflows

### Add New Flow
1. `/admin/crm/chatbot-builder` → Create Flow
2. Add start node (auto)
3. Add question/button nodes
4. Connect nodes
5. Set triggers
6. Test in test mode
7. Save and activate

### Update Settings
1. `/admin/crm/chatbot-settings`
2. Toggle features on/off
3. Update messages
4. Configure office hours
5. Click Save

### Monitor Conversations
1. `/admin/crm/whatsapp`
2. Filter by status (escalated, failed, etc.)
3. View conversation history
4. Manually respond if needed

## File Structure

```
app/admin/crm/
├── chatbot-builder/
│   └── page.tsx (Flow builder UI)
├── chatbot-settings/
│   └── page.tsx (Settings UI)
└── [flows, whatsapp, messages, etc.]

app/api/admin/crm/
├── chatbot-flows/
│   └── route.ts (CRUD operations)
├── chatbot-flows/[id]/
│   └── steps/route.ts (Step management)
└── chatbot-settings/
    └── route.ts (Settings CRUD)

lib/
├── db.ts (Schema definitions)
├── schemas/
│   ├── chatbotSchemas.ts (Chatbot models)
│   └── enterpriseSchemas.ts (Lead, conversation models)
└── chatbot/
    ├── executor.ts (Step execution logic)
    ├── matcher.ts (Flow matching)
    └── formatter.ts (Message formatting)

components/admin/crm/
├── ChatbotBuilder.tsx (Flow editor)
├── ChatbotStepNode.tsx (Step rendering)
└── [other CRM components]
```

## Environment Variables

No special environment variables needed for chatbot. Uses existing:
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Admin authentication
- `WHATSAPP_API_TOKEN` - For WhatsApp integration (optional)

## Security

✅ **Admin-only access** - Requires `isAdmin` JWT claim
✅ **Input validation** - All messages sanitized
✅ **Rate limiting** - Prevents abuse
✅ **Audit logging** - Track all changes
✅ **Data encryption** - Lead PII encrypted in transit

## Future Enhancements

- [ ] Visual flow designer with drag-drop canvas
- [ ] AI-powered response suggestions
- [ ] A/B testing flows
- [ ] Conversation analytics
- [ ] Multi-language support
- [ ] Handoff to human queue
- [ ] Sentiment analysis
- [ ] Custom Python flows
