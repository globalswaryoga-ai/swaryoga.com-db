# 📝 Notes System - Graphology & Color Psychology Edition

**Created:** December 19, 2025  
**Version:** 1.0.0 - MVP

## Overview

A stylish, personalized notes system designed for the Swar Yoga Life Planner with:
- **Graphology Support** - Handwriting-inspired fonts (Caveat, Playfair, etc.)
- **Color Psychology** - 10 scientifically-designed color themes
- **Mood Tracking** - 8 emotional states (happy, calm, creative, focused, etc.)
- **Vision Linking** - Attach notes to Visions, Goals, Tasks
- **Rich Organization** - Tags, word count, reading time, pinning

## Architecture

### Database Schema (`lib/db.ts`)

```typescript
Note {
  _id: ObjectId
  userId: ObjectId (indexed)
  title: string (required)
  content: string (required) - Rich text/markdown
  
  // Graphology & Styling
  fontFamily: 'poppins' | 'playfair' | 'caveat' | 'abril' | 'crimson' | 'lora'
  fontSize: 12-24px (default 16)
  lineHeight: 1.2-2.0 (default 1.6)
  letterSpacing: -2 to +2 (default 0)
  
  // Color Psychology
  colorTheme: [10 themes] (see below)
  backgroundColor: hex color
  textColor: hex color
  
  // Linking
  linkedTo: {
    visionId?: string
    goalId?: string
    taskId?: string
    actionPlanId?: string
  }
  
  // Metadata
  tags: [string]
  isPinned: boolean
  isPublic: boolean
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'calm' | 'focused' | 'creative' | 'confused'
  
  // Attachments
  attachments: [{
    url: string
    type: 'link' | 'image' | 'pdf' | 'file'
    title?: string
    uploadedAt: Date
  }]
  
  // Analytics
  wordCount: number
  readingTimeMinutes: number
  
  createdAt, updatedAt, lastEditedAt: Date
}
```

### Color Psychology Palette

| Theme | Colors | Psychology |
|-------|--------|-----------|
| 🌊 Serenity Blue | `#EBF4F7` / `#0B3C5D` | Calm, trust, communication |
| ❤️ Passion Red | `#FDEAE8` / `#8B0000` | Energy, intensity, emotions |
| 🌱 Growth Green | `#E8F5E9` / `#1B5E20` | Renewal, harmony, balance |
| 🔮 Wisdom Purple | `#F3E5F5` / `#4A148C` | Spirituality, imagination, insight |
| ⚡ Energy Orange | `#FFF3E0` / `#E65100` | Creativity, enthusiasm, warmth |
| 💖 Harmony Pink | `#FCE4EC` / `#880E4F` | Love, compassion, gentleness |
| ✨ Clarity Yellow | `#FFFDE7` / `#F57F17` | Optimism, clarity, intellect |
| 🌿 Nature Teal | `#E0F2F1` / `#004D40` | Growth, healing, stability |
| ☮️ Calm Lavender | `#F1E5FE` / `#4A148C` | Spirituality, peace, tranquility |
| 🎉 Joy Coral | `#FFEBEE` / `#C62828` | Vibrancy, warmth, enthusiasm |

### Graphology Fonts

```typescript
Fonts: [
  'poppins'   - Modern, clean (default)
  'playfair'  - Elegant serif
  'caveat'    - Handwritten script (journal-like)
  'abril'     - Display serif
  'crimson'   - Book serif
  'lora'      - Friendly serif
]
```

## API Routes

### Create Note
```bash
POST /api/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  title: "Morning Reflection",
  content: "Today was productive...",
  colorTheme: "serenity-blue",
  fontFamily: "caveat",
  fontSize: 18,
  mood: "calm",
  tags: ["reflection", "morning"],
  linkedTo: { visionId: "vision-123" }
}

Response: { success: true, data: { _id, ... } }
```

### Get Notes (with filtering)
```bash
GET /api/notes?search=yoga&tag=reflection&visionId=123&mood=calm&pinned=true&limit=50&skip=0
Authorization: Bearer <token>

Response: { success: true, data: [...], total: 15, limit: 50, skip: 0 }
```

### Update Note
```bash
PUT /api/notes/[id]
Authorization: Bearer <token>
Content-Type: application/json

{ title, content, colorTheme, fontFamily, fontSize, mood, tags, isPinned, linkedTo }

Response: { success: true, data: { _id, ... } }
```

### Delete Note
```bash
DELETE /api/notes/[id]
Authorization: Bearer <token>

Response: { success: true, message: "Note deleted" }
```

## Components

### NoteEditor (`components/NoteEditor.tsx`)

Modal component for creating/editing notes with:
- Rich text textarea
- Color theme picker (10 options)
- Font family selector (6 options)
- Font size slider (12-24px)
- Mood selector (8 options)
- Pin toggle
- Tag input
- Word count & reading time display
- Linking to Vision/Goal/Task

**Props:**
```typescript
interface NoteEditorProps {
  initialNote?: Note;
  visionId?: string;
  goalId?: string;
  taskId?: string;
  onSave: (note: any) => void;
  onClose: () => void;
}
```

### NotesWidget (`components/NotesWidget.tsx`)

Displays linked notes on Vision pages:
- Shows last 5 notes linked to Vision
- Expandable list
- Quick delete
- Quick add button
- Mood emoji indicators
- Word count display

### Notes Gallery Page (`app/life-planner/dashboard/notes/page.tsx`)

Full-screen notes gallery with:
- Grid layout (3 columns on desktop, 1 on mobile)
- Color-themed cards showing preview
- Search by title/content
- Filter by mood
- Filter by tag
- Pin/unpin notes
- Delete notes
- Edit notes
- Statistics (word count, reading time, creation date)

## Features

### ✅ Implemented

- [x] CRUD operations (Create, Read, Update, Delete)
- [x] MongoDB schema with proper indexing
- [x] JWT authentication on all endpoints
- [x] 10 color psychology themes
- [x] 6 graphology-inspired fonts
- [x] Mood tracking (8 states)
- [x] Tag-based organization
- [x] Pinning/unpinning notes
- [x] Word count & reading time calculation
- [x] Search & filtering
- [x] Vision/Goal/Task linking
- [x] Beautiful UI with color themes
- [x] Responsive design (mobile, tablet, desktop)
- [x] Navigation sidebar integration

### 🔄 Future Enhancements

- [ ] Rich text editor (markdown support)
- [ ] Image uploads to notes
- [ ] PDF export of notes
- [ ] Note sharing with accountability partners
- [ ] Comment system on shared notes
- [ ] AI-powered note suggestions
- [ ] Voice-to-text note capture
- [ ] Recurring/template notes
- [ ] Integration with daily/weekly/monthly views
- [ ] Note analytics dashboard
- [ ] Collaborative note editing

## Usage Examples

### Create a Note from Vision Page
```tsx
const handleSaveNote = async (noteData: any) => {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...noteData,
      linkedTo: { visionId: vision.id },
    }),
  });
  const { data } = await res.json();
  console.log('Note saved:', data);
};
```

### Fetch Notes for a Vision
```tsx
const fetchVisionNotes = async (visionId: string) => {
  const res = await fetch(`/api/notes?visionId=${visionId}&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { data } = await res.json();
  setNotes(data);
};
```

### Search & Filter Notes
```tsx
// Search + filter by mood + filter by tag
const url = new URLSearchParams({
  search: 'yoga',
  mood: 'calm',
  tag: 'reflection',
  limit: '50'
});

const res = await fetch(`/api/notes?${url}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

## Integration Points

### Life Planner Sidebar
- Added "Notes" link in `components/LifePlannerSidebar.tsx`
- Icon: FileText (purple)
- Route: `/life-planner/dashboard/notes`

### Vision Detail Page
- Can add `<NotesWidget visionId={vision.id} token={token} />` to show linked notes
- Quick add button for new notes
- Expandable list of recent notes

## Performance Optimizations

1. **Indexing Strategy**
   - `userId + createdAt`: Fast chronological queries
   - `userId + isPinned + createdAt`: Fast pinned notes queries
   - `userId + tags`: Fast tag filtering
   - `userId + linkedTo.visionId`: Fast vision-linked queries

2. **Query Optimization**
   - Use `.lean()` for read-only queries
   - Limit results with `.limit(limit).skip(skip)`
   - Calculated fields (wordCount, readingTime) to avoid runtime computation

3. **Frontend Optimization**
   - Lazy load images in attachments
   - Paginate large result sets
   - Debounce search input

## Database Backups

Notes are stored in the same MongoDB connection as other life planner data. Ensure regular backups:

```bash
# Backup note collection
mongoexport --uri="mongodb+srv://..." --collection=notes --out=notes_backup.json

# Restore
mongoimport --uri="mongodb+srv://..." --collection=notes notes_backup.json
```

## Testing

### Manual Tests
```bash
# Create note
curl -X POST http://localhost:3000/api/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "Test content", "mood": "calm"}'

# Get notes
curl http://localhost:3000/api/notes?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update note
curl -X PUT http://localhost:3000/api/notes/NOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated", "isPinned": true}'

# Delete note
curl -X DELETE http://localhost:3000/api/notes/NOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## File Structure

```
app/
├── api/
│   └── notes/
│       ├── route.ts          # POST, GET
│       └── [id]/
│           └── route.ts      # PUT, DELETE
└── life-planner/
    └── dashboard/
        └── notes/
            └── page.tsx      # Notes gallery page

components/
├── NoteEditor.tsx             # Note creation/editing modal
└── NotesWidget.tsx            # Vision-linked notes display

lib/
└── db.ts                      # Note schema (added)
```

## Environment Variables

No additional environment variables needed. Uses existing:
- `MONGODB_URI` - MongoDB connection
- `JWT_SECRET` - Token verification

## Commit History

```
feat: Add stylish Notes system with graphology + color psychology
  - MongoDB schema with graphology fonts and color psychology
  - CRUD API routes with JWT auth
  - NoteEditor component with 10 color themes
  - Notes gallery page with search/filter
  - NotesWidget for Vision integration
  - Updated LifePlannerSidebar navigation
```

---

**For questions or improvements**, check the component files or create an issue.
