# Quick Guide: Resizable Textarea Feature

## How to Use the Adjustable Message Box

### Visual Representation

```
Before (Fixed 8 rows):
┌──────────────────────────────┐
│ Type your message here...    │
│                              │  ← Fixed height
│                              │     (cannot resize)
│                              │
│                              │
│                              │
│                              │
│                              │
└──────────────────────────────┘

After (Resizable):
┌──────────────────────────────┐
│ Type your message here...    │
│                              │  ← Click and drag
│                              │     the corner to
└──────────────────────────────┘ resize up/down
          ╱╱ ← Drag here

Minimum (3 rows):          Maximum (8 rows):
┌──────────────────────────┐  ┌──────────────────────────┐
│ Type your message...     │  │ Type your message...     │
│                          │  │                          │
│                          │  │                          │
└──────────────────────────┘  │                          │
                              │                          │
                              │                          │
                              │                          │
                              └──────────────────────────┘
```

## Steps to Resize

1. **Locate the textarea** in the WhatsApp section of leads-followup page
2. **Position your mouse** at the bottom-right corner (you'll see the resize cursor ↙)
3. **Click and drag down** to increase size (adds more rows)
4. **Click and drag up** to decrease size (removes rows)
5. **Release mouse** to set new size
6. Component automatically adjusts row count

## Technical Details

| Setting | Value |
|---------|-------|
| Minimum Height | 72px (≈3 rows) |
| Maximum Height | 192px (≈8 rows) |
| Line Height | 24px |
| Resize Direction | Vertical only ↕️ |
| Resize Handle | Bottom-right corner |

## Browser Support

Works on all modern browsers:
- ✅ Chrome/Chromium
- ✅ Safari
- ✅ Firefox
- ✅ Edge

## Features

- **Smooth Resizing**: Drag to any size between min/max
- **Auto Row Adjustment**: Rows update automatically based on height
- **Persistent State**: Size state is maintained during session
- **Responsive**: Works on desktop (mobile has native mobile resize)

## Location in App

**Path**: `/admin/crm/leads-followup`
**Section**: WhatsApp Message Input
**When Available**: After selecting an action mode of "WhatsApp"

---

**Status**: ✅ Production Ready
**Version**: 1.0
**Last Updated**: January 13, 2026
