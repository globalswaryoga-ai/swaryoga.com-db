# 🎨 CRM Message Styling Guide

## Current Design

```
INCOMING MESSAGES (Green Background - From Customer)
════════════════════════════════════════════════════

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Hi, I want to book a yoga class  ┃  ← WHITE TEXT ON GREEN
┃ 2:30 PM                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

OUTGOING MESSAGES (Light Gray Background - From You)
════════════════════════════════════════════════════

                    ┌─────────────────────────────┐
                    │ Sure! Which class interests │  ← DARK TEXT ON LIGHT
                    │ you?                        │     GRAY
                    │ 2:32 PM                     │
                    └─────────────────────────────┘
```

---

## Color Scheme

### Incoming (Green Theme)
```
#22c55e (bg-green-500)     Main background
#ffffff (text-white)       Text color
#15803d (border-green-600) Border
#dcfce7 (text-green-100)   Timestamp text
```

### Outgoing (Gray Theme)
```
#f1f5f9 (bg-slate-100)     Main background
#0f172a (text-slate-950)   Text color
#cbd5e1 (border-slate-200) Border
#64748b (text-slate-500)   Timestamp text
```

---

## Message Flow in CRM

```
1. Customer sends WhatsApp
   ↓
2. Webhook receives it
   ↓
3. Saved in whatsappmessages (direction: 'inbound')
   ↓
4. Agent opens CRM
   ↓
5. Message shows with GREEN background
   ↓
6. Agent types reply
   ↓
7. Clicks Send
   ↓
8. Message shows with GRAY background
   ↓
9. Sent via Meta API to customer
```

---

## Testing the Styling

### Step 1: Send a Test Message
- Send WhatsApp message to your business number
- From phone: `919309986820` or any test number

### Step 2: View in CRM
- Go to: https://crm.swaryoga.com/admin/crm/whatsapp-meta
- You'll see the conversation in the left sidebar

### Step 3: Check Colors
- Incoming message: ✅ GREEN with white text
- Timestamp: ✅ Light green text
- If you reply: ✅ Light gray background

---

## Mobile vs Desktop

The styling works on both:
- ✅ Desktop (full CRM interface)
- ✅ Mobile (responsive design)
- ✅ Tablets (responsive layout)

---

## Accessibility

- ✅ Green + White has good contrast (WCAG AA compliant)
- ✅ Time stamps visible and readable
- ✅ Clear distinction between inbound/outbound

---

## Customization

If you want different colors, edit `/app/admin/crm/whatsapp-meta/page.tsx` at lines 1103-1111:

```tsx
// Change incoming message styling:
// Current: 'bg-green-500 text-white border border-green-600'
// Options:
// 'bg-blue-500 text-white'    ← Blue messages
// 'bg-purple-500 text-white'  ← Purple messages
// 'bg-emerald-600 text-white' ← Darker green
```

---

## Status

✅ **Live in Production**
- Deployed to https://crm.swaryoga.com
- Changes visible immediately
- No cache issues

---

**Styling complete! Ready for use!** 🎉

