# WhatsApp QR Page - Visual Layout Guide

## 📱 Full Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                          WHATSAPP SHARED INBOX                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────────────┐
│                          │                                          │
│    CHAT LIST SIDEBAR     │         CHAT WINDOW                      │
│    (w-80, bg-white)      │         (flex-1, bg-[#efeae2])          │
│                          │                                          │
│  ┌──────────────────┐    │  ┌───────────────────────────────────┐  │
│  │ 👤 User Profile  │    │  │ 👤/👥 Chat Header                │  │
│  │ Connected ●      │    │  │  Name                             │  │
│  │              ┌───────────┤ "online" or "N members"           │  │
│  │         [▲Login] [→Logout] [⊕New]                          │  │
│  │              └───────────┤                        [×] Close  │  │
│  │                         │ └───────────────────────────────────┘  │
│  │ ⚠ Error message         │                                        │
│  │ [Reconnect Now]         │  ┌─────────────────────────────────┐  │
│  └──────────────────┘      │  │  💬 Messages Area (auto-scroll) │  │
│                            │  │                                 │  │
│  ┌──────────────────┐      │  │  ← Received messages (white)    │  │
│  │ 🔍 Search chats  │      │  │                 Sent → (green)  │  │
│  └──────────────────┘      │  │                    ✓✓ ✓         │  │
│                            │  └─────────────────────────────────┘  │
│  ┌──────────────────┐      │                                        │
│  │ 👤 Chat 1        │      │  ┌─────────────────────────────────┐  │
│  │ Last message...  │ ◄────┤  │ [+] Type message... [😊] [➤]   │  │
│  │                  │      │  │ Emoji Grid (appears above)     │  │
│  │ 👤 Chat 2        │      │  │ Media Menu (appears above +)   │  │
│  │ Last message...  │      │  │                                 │  │
│  │                  │      │  │ 🖼️ Photos & Videos              │  │
│  │ 👥 Group Chat    │      │  │ 📄 Document                    │  │
│  │ "Group · 5 mbr"  │      │  │ 🎤 Audio                       │  │
│  │                  │      │  │ 👥 Contact                     │  │
│  │ 👥 Another Group │      │  │ 📍 Location                    │  │
│  │ "Group · 8 mbr"  │      │  └─────────────────────────────────┘  │
│  │                  │      │                                        │
│  └──────────────────┘      │                                        │
│  (scrollable)              │  (scrollable)                          │
│                            │                                        │
└──────────────────────────┴──────────────────────────────────────────┘
```

---

## 🎯 Header Section (Top Left)

### Disconnected State:
```
┌──────────────────────────────────────────┐
│  👤 WhatsApp             [▲Login] [⊕New] │
│  Disconnected ●                          │
│                                          │
│  ⚠ Bridge issue                          │
│  Connection failed: timeout              │
│  [Reconnect Now]                         │
└──────────────────────────────────────────┘
```

### Connected State:
```
┌──────────────────────────────────────────┐
│  👤 User Name            [→Logout] [⊕New]│
│  Connected ● (green)                     │
└──────────────────────────────────────────┘
```

### Loading State:
```
┌──────────────────────────────────────────┐
│  👤 User Name            [▲Login] [⊕New] │
│  Connecting ● (blue, pulsing)            │
└──────────────────────────────────────────┘
```

### QR Scanning State:
```
┌──────────────────────────────────────────┐
│  👤 WhatsApp             [▲Login] [⊕New] │
│  Scan QR Code ● (amber, pulsing)         │
└──────────────────────────────────────────┘
```

---

## 🎨 Button Grouping (Right Side Header)

### Layout:
```
┌────────────────────────────────────┐
│ [▲ Login (QR)] [→ Logout] [⊕ New]  │   ← All in ONE gray box
└────────────────────────────────────┘
```

### When Disconnected:
```
┌────────────────────────────────────┐
│ [▲ Login (QR)] | [⊕ New]           │
└────────────────────────────────────┘
```

### When Connected:
```
┌────────────────────────────────────┐
│ [→ Logout] | [⊕ New]               │
└────────────────────────────────────┘
```

### When Loading:
```
┌────────────────────────────────────┐
│ [⟳ Login...] [⊕ New]               │
└────────────────────────────────────┘
```

---

## 💬 Message Input Section

### Collapsed State:
```
┌─────────────────────────────────────────┐
│ [+] Aa                            [😊] [➤] │
└─────────────────────────────────────────┘
  ↓    ↓                             ↓   ↓
media  input                       emoji send
```

### With Emoji Picker Open:
```
┌─────────────────────────────────────────┐
│ [+] Aa                            [😊] [➤] │
├─────────────────────────────────────────┤
│ 😊 😂 🥰 😍 🎉 🔥 👍 ❤️               │
│ 😢 😡 🤔 👏 💪 🚀 ⭐ ✨               │
│ 💯 🎈 🎁 🌟 💝 😎 🤗 😘               │
│ 😌 😴 😷 🥳 💕                         │
└─────────────────────────────────────────┘
```

### With Media Menu Open:
```
┌─────────────────────────────────────────┐
│ [+] Aa                            [😊] [➤] │
├────────────┐                             │
│ 🖼️ Photos  │                             │
│ 📄 Docs    │                             │
│ 🎤 Audio   │                             │
│ 👥 Contact │                             │
│ 📍 Loc     │                             │
└────────────┘                             │
```

---

## 📋 Chat List Items

### Individual Chat:
```
┌──────────────────────────────┐
│ 👤 [Profile Pic/Avatar]      │
│    Name                      │
│    Last message text...      │
└──────────────────────────────┘
```

### Group Chat:
```
┌──────────────────────────────┐
│ 👥 [Purple Group Icon]       │
│    Group Name                │
│    Group · 5 members         │
└──────────────────────────────┘
```

---

## 💬 Message Bubbles

### Received (from contact):
```
┌──────────────────┐
│ User's message   │  ← White bubble, left side
└──────────────────┘    border-radius: 2xl except bottom-left
```

### Sent (from you):
```
                  ┌──────────────────┐
                  │ Your message ✓   │  ← Green bubble, right side
                  │ 15:30 ✓✓         │     with tick marks
                  └──────────────────┘
```

### Tick Marks (Ack Status):
```
✓      = Message sent (gray)
✓✓     = Message delivered (gray)
✓✓     = Message read (blue)
```

---

## 🎯 Colors Used

| Component | Color | Hex Code |
|-----------|-------|----------|
| Connected Status | Emerald/Green | `#059669` |
| Loading Status | Sky Blue | `#0369a1` |
| QR Scanning | Amber/Orange | `#b45309` |
| Disconnected | Gray | `#6b7280` |
| Sent Message | Light Green | `#d9fdd3` |
| Received Message | White | `#ffffff` |
| Error Background | Light Red | `#fef2f2` |
| Input Background | White | `#ffffff` |
| Button Hover | Lighter | `opacity: 0.8` |
| Group Avatar BG | Purple | `#a855f7` - `#7e22ce` |

---

## ⚡ Interactive States

### Button States:
- **Normal**: Full opacity, cursor: pointer
- **Hover**: Darker shade or background highlight
- **Active/Loading**: Icon changes to ⟳ spinner
- **Disabled**: Opacity 60%, cursor: not-allowed

### Input States:
- **Normal**: White bg, gray border
- **Focus**: Blue ring (2px solid #0369a1)
- **Disabled**: Gray bg, reduced opacity

### Emoji Picker:
- **Closed**: Hidden, 0 height
- **Open**: Slides down, grid visible
- **Click emoji**: Closes automatically

### Media Menu:
- **Closed**: Hidden, 0 height
- **Open**: Slides down from + button
- **Click option**: Closes automatically

---

## 📱 Responsive Behavior

- **Desktop**: Full layout with 320px sidebar + chat window
- **Tablet**: Sidebar width reduces, buttons stack if needed
- **Mobile**: Could show tabs or collapse sidebar

**Current**: Optimized for desktop/tablet usage

---

**Visual Design Philosophy**: 
- Clean, minimal WhatsApp Web aesthetic
- Professional but approachable
- One-click access to all features
- Clear visual feedback for all states
- Error messages with recovery options
