# WhatsApp Integration Architecture Diagrams

## Current Swar Yoga Setup (Hybrid)

```
USER PERSPECTIVE:
─────────────────────────────────────────────────────

Desktop/Mobile
      │
      │ Opens CRM
      ▼
┌──────────────────────────────────────┐
│     Swar Yoga CRM (swaryoga.com)     │
│     (Vercel, Next.js)                │
├──────────────────────────────────────┤
│  • Leads management                  │
│  • WhatsApp messaging UI             │
│  • Admin dashboard                   │
│  • Message history storage           │
└──────────────────────────────────────┘
      │
      │ User clicks "Send Message"
      ▼
      ├─ Option A: Cloud API
      │  (If WHATSAPP_ACCESS_TOKEN set)
      │
      │  ┌──────────────────────────────────┐
      │  │  Meta WhatsApp Cloud API         │
      │  │  (Official Meta endpoints)       │
      │  │  Graph API v20.0                 │
      │  └──────────────────────────────────┘
      │            │
      │            ▼ HTTPS
      │  ┌──────────────────────────────────┐
      │  │  WhatsApp Servers (Meta)         │
      │  │  • Message routing               │
      │  │  • Delivery tracking             │
      │  └──────────────────────────────────┘
      │            │
      │            ▼
      │  Recipient's WhatsApp
      │
      │
      └─ Option B: WhatsApp Web QR
         (If wa-bridge.swaryoga.com available)
         
         User sees QR code first
         │
         ├─ Scan with phone's WhatsApp
         │
         ▼
         ┌──────────────────────────────────┐
         │  wa-bridge.swaryoga.com          │
         │  (Self-hosted VPS/EC2)           │
         │  • Node.js server                │
         │  • Docker container              │
         │  • whatsapp-web.js client        │
         │  • Puppeteer browser             │
         └──────────────────────────────────┘
                   │
                   ▼ WebSocket (WSS)
         ┌──────────────────────────────────┐
         │  WhatsApp Web Protocol           │
         │  (Same as web.whatsapp.com)      │
         └──────────────────────────────────┘
                   │
                   ▼
         Recipient's WhatsApp
```

---

## Architecture Comparison: Eazybe vs Swar Yoga

### Eazybe (All-in-One)
```
┌─────────────────────────────────────────────┐
│        Single Eazybe Server (Node.js)       │
├─────────────────────────────────────────────┤
│  • Web UI (React/Vue)                       │
│  • WhatsApp Web bridge (whatsapp-web.js)    │
│  • Message routing                          │
│  • Database                                 │
│  • Message templates                        │
│  • Webhooks                                 │
└─────────────────────────────────────────────┘
          │
          ├─ Browser → Eazybe UI
          │
          └─ WhatsApp Web Protocol
                     │
                     ▼
             WhatsApp Servers
```

**Pros:** Single system, simple deployment  
**Cons:** Hard to scale, everything on one server

---

### Swar Yoga (Hybrid - Recommended)
```
┌──────────────────────────────────────────┐
│   Swar Yoga CRM (Vercel, serverless)     │
├──────────────────────────────────────────┤
│ • Web UI (Next.js)                       │
│ • CRM features (leads, workshops, etc)   │
│ • Admin dashboard                        │
│ • Database (MongoDB)                     │
└──────────────────────────────────────────┘
         │
         ├─ Browser → CRM UI
         │
         ├─ Send Message via Cloud API
         │  │
         │  ▼
         │  ┌──────────────────────────────┐
         │  │  Meta Cloud API (Official)   │
         │  │  • Verified by Meta          │
         │  │  • SLA 99.9%                 │
         │  │  • Per-message billing       │
         │  └──────────────────────────────┘
         │       │
         │       ▼ WhatsApp Servers
         │
         └─ OR: Send Message via Web QR
            │
            ▼
            ┌──────────────────────────────┐
            │ wa-bridge.swaryoga.com       │
            │ (Self-hosted VPS/EC2)        │
            ├──────────────────────────────┤
            │ • Node.js server             │
            │ • Docker container           │
            │ • whatsapp-web.js client     │
            │ • Message routing            │
            └──────────────────────────────┘
                   │
                   ▼ WhatsApp Web Protocol
             WhatsApp Servers
```

**Pros:** 
- Separated concerns (CRM ≠ Messaging)
- Independent scaling
- Serverless CRM = cheap + reliable
- Optional bridge = flexibility
- Industry standard

**Cons:**
- Two systems to manage (if using QR)
- Initial setup complexity

---

## Message Flow Diagrams

### Path 1: Cloud API Message Flow
```
User in CRM              Vercel          Meta Servers     WhatsApp
────────────────────────────────────────────────────────────────

1. Click Send
   │
   ├─► POST /api/admin/crm/messages
                │
                ├─► Validate (auth, phone, content)
                │
                ├─► Store in MongoDB (queued)
                │
                ├─► Call: sendWhatsAppText()
                │              │
                │              ├─► Format message
                │              │
                │              ├─► Add auth headers
                │              │
                │              └─► POST to Meta
                │                    │
                │                    ▼
                │              POST /v20.0/{phoneID}/messages
                │                    │
                │                    │ HTTPS
                │                    ▼
                │              ┌─────────────────────┐
                │              │ Meta Graph API      │
                │              │ • Validate token    │
                │              │ • Check quotas      │
                │              │ • Route message     │
                │              └─────────────────────┘
                │                    │
                │                    ▼
                │              ┌─────────────────────┐
                │              │ WhatsApp Servers    │
                │              │ • Encrypt message   │
                │              │ • Deliver to phone  │
                │              └─────────────────────┘
                │                    │
                │                    ▼
                │              Recipient receives msg
                │              in WhatsApp app
                │
                └─► Update message status: "sent"

Total latency: ~2-5 seconds ✓
Reliability: 99.9% SLA ✓
Cost: Per message ✓
```

---

### Path 2: WhatsApp Web QR Flow
```
User in CRM           Vercel          wa-bridge.swaryoga.com     WhatsApp
────────────────────────────────────────────────────────────────────────

INITIAL QR LOGIN:

1. User clicks "Connect WhatsApp"
   │
   ├─► GET /api/admin/crm/whatsapp/qr
                │
                ├─► wa-bridge generates QR
                │
                ├─► Base64 encode QR image
                │
                └─► Return to browser
   
2. Browser displays QR code
   │
   ├─► User scans with WhatsApp phone app
   │
   └─► WhatsApp Web session established on bridge

SENDING MESSAGE:

3. User selects lead & types message
   │
   ├─► POST /api/admin/crm/whatsapp/send
                │
                ├─► Verify client is ready
                │
                ├─► Forward to bridge
                │         │
                │         ▼ HTTPS/WebSocket
                │    wa-bridge.swaryoga.com
                │         │
                │         ├─► whatsapp-web.js client
                │         │
                │         ├─► Format message
                │         │
                │         └─► Send via WhatsApp Web
                │              Protocol
                │                    │
                │                    ▼
                │              WhatsApp Servers
                │                    │
                │                    ▼
                │              Recipient receives msg
                │
                └─► Update status: "sent"

Total latency: ~1-3 seconds ✓
Reliability: Depends on bridge uptime ⚠️
Cost: VPS only (no per-message) ✓
```

---

## Network Diagram: Full System

```
                    INTERNET
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼

    Browser      DNS: swaryoga.com   DNS: wa-bridge.swaryoga.com
      │                  │                   │
      │                  │                   │
      │         ┌────────┴────────┐          │
      │         │                 │          │
      │         ▼                 │          │
      │    [Vercel CDN]           │          │
      │         │                 │          │
      │         ▼                 ▼          ▼
      │    Next.js App ─────────────────┐  Node.js Server
      │    (Serverless)         │      │  (VPS/EC2)
      │         │               │      │
      │         │               │      │
      │    [Vercel]             │      │
      │         │               │      │
      │         ├─Cloud API────►│      │  ┌────────────────┐
      │         │               │      │  │ whatsapp-web.js│
      │         │           ┌───┴──────┴─►│ • QR generator │
      │         │           │             │ • Message send │
      │         │           │             │ • Message recv │
      │    ┌────┴───────┐   │             └────────────────┘
      │    │ MongoDB    │   │                    │
      │    │ (Atlas)    │   │                    │
      │    └────────────┘   │           ┌────────┴────────┐
      │         │           │           │                 │
      │         ▼           │           ▼                 ▼
      │    Messages stored  │      WhatsApp Web     Puppeteer
      │    Message history  │      Protocol         (Browser)
      │                     │           │
      ▼                     │           │
  CRM UI                    │           │
  (React)                   │           ▼
  • Leads                   │      WhatsApp Servers
  • Messages                │      (Meta)
  • Admin                   │
                            │
                    ┌───────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
    Meta Cloud API      WhatsApp Protocol
    (Graph API v20)     (Web-based)
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
            WhatsApp Servers
            (Central routing)
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    Recipient   Recipient   Recipient
    Mobile      Mobile      Mobile
    (WhatsApp)  (WhatsApp)  (WhatsApp)
```

---

## Data Flow: Database Perspective

```
CRM UI → POST /api/admin/crm/messages/
        ↓
    ┌─────────────────────────────────┐
    │    Validate Input               │
    │ • Check auth                    │
    │ • Check rate limit              │
    │ • Validate phone number         │
    │ • Validate message content      │
    └─────────────────────────────────┘
        ↓ Valid
    ┌─────────────────────────────────┐
    │  MongoDB WhatsAppMessage Create  │
    │ • status: "queued"              │
    │ • leadId: reference             │
    │ • phoneNumber: "91..."          │
    │ • message: user text            │
    │ • direction: "outgoing"         │
    │ • sentAt: now()                 │
    └─────────────────────────────────┘
        ↓
    ┌─────────────────────────────────┐
    │  Send via Cloud API OR QR       │
    │  Try: sendWhatsAppText()        │
    └─────────────────────────────────┘
        ↓ Success
    ┌─────────────────────────────────┐
    │  Update WhatsAppMessage         │
    │ • status: "sent"                │
    │ • waMessageId: "wamid_..."      │
    │ • updatedAt: now()              │
    └─────────────────────────────────┘
        ↓
    ┌─────────────────────────────────┐
    │  Update Lead                    │
    │ • lastMessageAt: now()          │
    │ • messageCount: ++              │
    └─────────────────────────────────┘
        ↓
    ┌─────────────────────────────────┐
    │  Log to AuditLogger             │
    │ • user: admin ID                │
    │ • action: "message_send"        │
    │ • resource: message_id          │
    │ • timestamp                     │
    └─────────────────────────────────┘
        ↓
    Return success to CRM UI
    ✓ Message sent!
```

---

## Deployment Topology

### Option A: Cloud API Only
```
┌───────────────────────────────────┐
│         Vercel (Free/Paid)        │
├───────────────────────────────────┤
│ • Swar Yoga CRM (Next.js)         │
│ • API routes                      │
│ • MongoDB (Atlas)                 │
├───────────────────────────────────┤
│ Storage:                          │
│ • Blob (Vercel)                   │
│ • Database (MongoDB Atlas)        │
└───────────────────────────────────┘
        │
        ├─ Cloud API → Meta
        │
        └─ Custom domain → swaryoga.com
```

**Total servers:** 1 (Vercel)  
**Cost:** ~$20-100/month  
**Setup time:** 15 minutes

---

### Option B: With WhatsApp Web QR
```
┌───────────────────────────────────┐    ┌──────────────────────────┐
│         Vercel (Paid)             │    │    VPS/EC2               │
├───────────────────────────────────┤    ├──────────────────────────┤
│ • Swar Yoga CRM (Next.js)         │    │ • wa-bridge server       │
│ • API routes                      │    │ • Node.js + Docker       │
│ • MongoDB (Atlas)                 │    │ • whatsapp-web.js        │
├───────────────────────────────────┤    ├──────────────────────────┤
│ Domain: swaryoga.com              │    │ Domain: wa-bridge.       │
│         API v1 → Vercel           │    │         swaryoga.com     │
└───────────────────────────────────┘    └──────────────────────────┘
        │                                        │
        ├─ Cloud API ──→ Meta                   │
        │                                        │
        ├─ WebSocket ────────────────────────────┘
        │                 (wss://)
        │
        └─ Custom domain → swaryoga.com
```

**Total servers:** 2 (Vercel + VPS)  
**Cost:** ~$40-150/month  
**Setup time:** 2-3 hours

---

## Decision Tree

```
START: Need WhatsApp messaging?
  │
  ├─ YES: Can we use Meta/official API?
  │  │
  │  ├─ YES → Cloud API (RECOMMENDED)
  │  │        • Add credentials to Vercel
  │  │        • 15 min setup
  │  │        • Status: Ready now ✓
  │  │
  │  └─ NO: Need WhatsApp Web QR?
  │     │
  │     ├─ YES → Self-hosted Bridge
  │     │        • Rent VPS/EC2
  │     │        • Deploy Docker container
  │     │        • 1-2 hour setup
  │     │        • Status: Code ready ✓
  │     │
  │     └─ NO → No solution needed
  │
  └─ NO: Don't implement
```

---

**Diagrams Updated:** January 3, 2026  
**Status:** Complete architectural documentation
