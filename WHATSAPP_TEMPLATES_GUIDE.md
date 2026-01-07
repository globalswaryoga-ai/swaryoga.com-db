╔════════════════════════════════════════════════════════════════════════════════════════╗
║           WHATSAPP MESSAGE TEMPLATES - USE CASES & GUIDE                               ║
╚════════════════════════════════════════════════════════════════════════════════════════╝

📋 WHAT ARE MESSAGE TEMPLATES?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pre-approved messages from Meta that you can send WITHOUT customer initiating conversation.
They're faster, cheaper, and more reliable than regular messages.

Key Benefits:
✅ Send messages ANYTIME (not just in reply to customer)
✅ 24-hour window (templates have longer validity)
✅ Better delivery rates
✅ Lower cost per message
✅ Can include rich content (images, buttons, lists)


🎯 TOP USE CASES FOR YOUR APP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  APPOINTMENT REMINDERS (Yoga Classes)
   ┌─────────────────────────────────────────┐
   │ "Hi {{name}}, your yoga class is        │
   │  tomorrow at {{time}}. See you then! 🧘 │
   └─────────────────────────────────────────┘
   Use Case: Remind customers 24 hours before their class
   Variables: name, time, class_name
   Frequency: Daily


2️⃣  ORDER CONFIRMATIONS (Workshops)
   ┌─────────────────────────────────────────┐
   │ "Thank you {{name}}!                    │
   │  Your workshop {{workshop}} is          │
   │  confirmed for {{date}} at {{time}}.    │
   │  Order ID: {{order_id}}                 │
   └─────────────────────────────────────────┘
   Use Case: Immediately confirm purchase
   Variables: name, workshop, date, time, order_id
   Frequency: On purchase


3️⃣  PAYMENT REMINDERS (Pending Orders)
   ┌─────────────────────────────────────────┐
   │ "Hi {{name}}, complete your payment     │
   │  for {{workshop}}. Amount: {{amount}}    │
   │  Click here to pay ➡️                    │
   │  [BUTTON: Pay Now]                      │
   └─────────────────────────────────────────┘
   Use Case: Remind about pending payments
   Variables: name, workshop, amount, payment_link
   Frequency: Every 2 days until paid


4️⃣  COURSE COMPLETION (Life Planner)
   ┌─────────────────────────────────────────┐
   │ "Congratulations {{name}}!              │
   │  You completed {{course}}.              │
   │  Certificate ready ✅                   │
   │  [BUTTON: Download Certificate]        │
   └─────────────────────────────────────────┘
   Use Case: Celebrate milestones
   Variables: name, course
   Frequency: On completion


5️⃣  FEEDBACK REQUESTS (After Events)
   ┌─────────────────────────────────────────┐
   │ "How was {{event_name}}, {{name}}?      │
   │  Your feedback helps us improve.        │
   │  [BUTTON: Rate Us] [BUTTON: Feedback]   │
   └─────────────────────────────────────────┘
   Use Case: Get reviews after class/workshop
   Variables: name, event_name
   Frequency: After event


6️⃣  SPECIAL OFFERS (Marketing)
   ┌─────────────────────────────────────────┐
   │ "Special offer for you, {{name}}! 🎉    │
   │  {{discount}}% off {{product}}          │
   │  Valid until {{expiry}}                 │
   │  [BUTTON: Claim Offer]                  │
   └─────────────────────────────────────────┘
   Use Case: Promote new classes/products
   Variables: name, discount, product, expiry
   Frequency: Monthly/promotional


7️⃣  ACCOUNT VERIFICATION
   ┌─────────────────────────────────────────┐
   │ "Your verification code: {{code}}       │
   │  Valid for 10 minutes.                  │
   │  Never share this code.                 │
   └─────────────────────────────────────────┘
   Use Case: OTP verification
   Variables: code
   Frequency: On signup/login


8️⃣  WAITLIST NOTIFICATIONS
   ┌─────────────────────────────────────────┐
   │ "Good news {{name}}! {{class}} now has  │
   │  spots available. Enroll now!           │
   │  [BUTTON: Enroll]                       │
   └─────────────────────────────────────────┘
   Use Case: Full class → Waitlist → Spot opens
   Variables: name, class
   Frequency: As spots open


════════════════════════════════════════════════════════════════════════════════════════════

🔧 WHICH TEMPLATES TO CREATE FIRST?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIORITY 1 (High Impact):
  1. Appointment Reminders → Used every day
  2. Order Confirmation → High conversion
  3. Payment Reminders → Revenue recovery

PRIORITY 2 (Essential):
  4. Course Completion → Engagement
  5. Special Offers → Growth
  6. Verification OTP → Security

PRIORITY 3 (Nice to Have):
  7. Feedback Requests → Improvement
  8. Waitlist Notification → Retention


════════════════════════════════════════════════════════════════════════════════════════════

📱 TEMPLATE MESSAGE STRUCTURE (Meta Requirements)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each template must have:

Template Name:        appointment_reminder
Category:             ACCOUNT_UPDATE (or MARKETING, UTILITY, etc.)
Language:             en (English) or hi (Hindi)
Header:               Optional (image, video, document)
Body:                 Main message text (up to 1024 chars)
Footer:               Optional (company info)
Buttons:              Optional (CTA, quick reply buttons)
Variables:            {{name}}, {{time}}, {{date}}

Example:
  Name:     "yoga_class_reminder"
  Body:     "Hi {{name}}, your class {{class}} is in {{hours}} hours. See you at {{time}}! 🧘"
  Buttons:  [Confirm] [Reschedule] [Cancel]


════════════════════════════════════════════════════════════════════════════════════════════

✅ RECOMMENDED FOR YOUR APP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Start with these 5 templates:

1. Class Reminder (English & Hindi)
   "Hi {{name}}, your {{class}} class is tomorrow at {{time}}. See you there! 🧘‍♀️"

2. Order Confirmation (English & Hindi)
   "Thank you {{name}}! Your {{workshop}} is confirmed for {{date}}. Order ID: {{order_id}}"

3. Payment Required (English & Hindi)
   "Hi {{name}}, payment due for {{workshop}}. Amount: ₹{{amount}}. Pay now: {{link}}"

4. Course Completed (English & Hindi)
   "Congratulations {{name}}! You completed {{course}}. Certificate ready! ✅"

5. Verification Code (English only - no variables)
   "Your verification code: {{code}}. Valid for 10 minutes. Never share this."


════════════════════════════════════════════════════════════════════════════════════════════

📝 NEXT STEP:

Tell me which 5 templates you want to create first, and I'll:
1. Set up the template structure in your database
2. Create API endpoints to send them
3. Add UI to manage templates
4. Set up automatic triggers

Which ones?  1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣

════════════════════════════════════════════════════════════════════════════════════════════
