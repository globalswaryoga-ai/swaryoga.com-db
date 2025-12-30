# Lead Followup Page - Visual Guide

## Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back  📋 Open Lead List*   Lead Followup                      │
│                              Manage conversations...            │
├─────────────────────────────────────────────────────────────────┤
│ 📝 Notes 💬 WhatsApp 📧 Email 📱 SMS ✓ Todos ⏰ Reminder ➡️ Follow Next 🏷️ Labels │
└─────────────────────────────────────────────────────────────────┘
                                * Only visible on mobile

┌──────────────────┬──────────────────────┬────────────────────┐
│  Left Sidebar    │    Center Form       │   Right Preview    │
│                  │                      │                    │
│ 🔍 Lead Search ▼ │                      │ Last Notes/        │
│ ┌──────────────┐ │                      │ Followups          │
│ │ Dropdown:    │ │ Form based on        │                    │
│ │ Lead | Wksp  │ │ action mode:         │ • Notes            │
│ │ Admin        │ │ • Notes textarea     │ • Reminders        │
│ │ [Search...]  │ │ • WhatsApp composer  │ • Todos            │
│ │              │ │ • Email body         │ • Followups        │
│ │ Results:     │ │ • SMS text           │                    │
│ │ • Name1      │ │ • Todo items         │                    │
│ │ • Name2      │ │ • Date pickers       │                    │
│ │ • Name3      │ │                      │                    │
│ └──────────────┘ │ [Save]               │                    │
│                  │                      │                    │
│ Selected Lead    │                      │                    │
│ ┌──────────────┐ │                      │                    │
│ │ Name         │ │                      │                    │
│ │ Phone        │ │                      │                    │
│ │ Email        │ │                      │                    │
│ └──────────────┘ │                      │                    │
└──────────────────┴──────────────────────┴────────────────────┘
```

---

## Search Dropdown UI (Desktop & Mobile)

### Closed State
```
┌──────────────────────────┐
│ 🔍 Lead Search ▼         │
└──────────────────────────┘
```

### Open State
```
┌──────────────────────────┐
│ 🔍 Lead Search ▲         │◄──── Click to toggle
├──────────────────────────┤
│ 👤 Lead | 🏫 Workshop |  │◄──── Filter tabs (clickable)
│ 👨‍💼 Admin                  │
├──────────────────────────┤
│ Search by name, mobile.. │◄──── Dynamic placeholder
│ [input field]            │
├──────────────────────────┤
│ ✓ Results:               │
│ • John Doe               │
│   9876543210             │
│   john@mail.com          │
│                          │
│ • Jane Smith             │
│   9876543211             │
│   jane@mail.com          │
│                          │
│ • Ram Sharma             │
│   9876543212             │
│   ram@mail.com           │
│                          │
│ Start typing to search...|
└──────────────────────────┘
```

---

## Filter Types & Display

### 👤 Lead Filter
**Shows:** Individual leads matching search
**Search:** By name, mobile, email, or ID
**Results:** Name, Phone, Email

```
Search: "john"
Results:
• John Doe
  9876543210
  john@example.com

• Johnny Smith
  9876543220
  johnny@example.com
```

---

### 🏫 Workshop Filter
**Shows:** Unique workshop names
**Search:** By workshop name
**Results:** Workshop name only

```
Search: "yoga"
Results:
• Beginner Yoga Course
• Advanced Yoga Retreat
• Yoga for Stress Relief
• Online Yoga Sessions
```

---

### 👨‍💼 Admin Filter
**Shows:** Admin users (from leads source field)
**Search:** By admin name
**Results:** Admin name only

```
Search: "admin"
Results:
• Admin
• Admin-CRM
• Admin-Sales
• Manual
```

---

## Mobile Layout

### Without Lead Selected (Initial State)
```
┌──────────────────────────┐
│ ← Back | 📋 Open List    │ ◄──── Button visible
├──────────────────────────┤
│   Lead Followup          │
│   Manage conversations   │
├──────────────────────────┤
│ 📝 💬 📧 📱 ✓ ⏰ ➡️ 🏷️  │
│                          │
│ Empty state - select a   │
│ lead to start            │
└──────────────────────────┘
```

### After Tapping "Open Lead List"
```
┌──────────────────────────┐
│ ← Back | 📋 Open List    │
├──────────────────────────┤
│ 🔍 Lead Search ▼         │ ◄──── Sidebar shows
│ [tabs and search]        │
│ Results list...          │
│                          │
│                          │
└──────────────────────────┘

(Main form area hidden, sidebar in modal)
```

### After Selecting Lead
```
┌──────────────────────────┐
│ ← Back                   │ ◄──── Button hidden (lead selected)
├──────────────────────────┤
│   Selected Lead: John    │
│   Phone: 9876543210      │
├──────────────────────────┤
│ 📝 💬 📧 📱 ✓ ⏰ ➡️ 🏷️  │
│                          │
│ Action form appears here │
│                          │
└──────────────────────────┘

(Sidebar auto-closes)
```

---

## Interaction Flowchart

```
User Action                    → State Change              → UI Update
─────────────────────────────────────────────────────────────────────

Desktop:
Click "🔍 Lead Search" button   → showSearchPanel = true   → Dropdown opens
Type in search field           → searchQuery = "..."      → Results filter
Click "👤 Lead" tab            → searchFilterType = lead   → Display leads
Click result                   → selectedLead = obj        → Form shows, dropdown closes
Select action button           → actionMode = "notes"     → Form updates

Mobile:
Click "📋 Open List" button     → sidebarOpen = true       → Sidebar slides in
Click "🔍 Lead Search" button   → showSearchPanel = true   → Dropdown opens in sidebar
Type search                    → searchQuery = "..."      → Filter results
Click result                   → selectedLead = obj        → sidebarOpen = false (auto-close)
                                                            → Button disappears (action form shows)
```

---

## Color & Styling Reference

### Search Button
- **Background:** Dark gradient (slate-900 to slate-800)
- **Text:** White
- **Hover:** Slightly lighter gradient (slate-800 to slate-700)
- **Width:** Full (100%)
- **Height:** 2.5rem (py-2.5)

### Filter Tabs (Active)
- **Background:** Dark (slate-900)
- **Text:** White
- **Border:** None

### Filter Tabs (Inactive)
- **Background:** Light (slate-100)
- **Text:** Slate-700
- **Hover:** Darker gray (slate-200)

### Search Input
- **Border:** Slate-300
- **Focus:** Slate-900 with ring-1
- **Placeholder:** Dynamic based on filter type

### Result Items
- **Background:** White (default)
- **Hover:** Light gray (slate-100)
- **Border:** Slate-200 on hover
- **Padding:** py-2.5, px-3

---

## Accessibility Features

✅ **Keyboard Navigation**
- Tab through buttons
- Enter to activate
- Escape to close dropdown

✅ **Screen Readers**
- Semantic HTML buttons
- ARIA labels via title attributes
- Clear button text with emojis

✅ **Touch-Friendly**
- Large button tap targets (min 44px)
- Adequate spacing between options
- Clear visual feedback on selection

---

## Performance Notes

**Filtering:**
- Uses `.filter()` and `.map()` for data transformation
- Results cached in component state
- No external API calls during search (client-side only)

**Mobile:**
- Sidebar uses CSS transitions for smooth animation
- `md:hidden` and `hidden/block` for responsive display
- Auto-close eliminates extra taps on mobile

---

## Dark Mode Compatible

All colors use Tailwind's slate palette which automatically adapts in dark mode:
- Text remains readable
- Backgrounds adjust appropriately
- Borders maintain contrast

---

## Next Steps (If Needed)

1. **Add Recent Searches:** Cache last 5 searches per filter type
2. **Keyboard Shortcuts:** Cmd+K to open search on desktop
3. **Search History:** Show previously searched items
4. **Favorites:** Star frequently accessed leads/workshops
5. **Advanced Filters:** Combine multiple criteria
