# Admin Panel Setup Guide

## Quick Start

### 1. Access Admin Panel
- **URL:** http://localhost:3000/admin/login
- **Username:** admin
- **Password:** Mohanpk@1010

### 2. Navigate Admin Pages
Once logged in, use the sidebar to access:
- Dashboard - Overview and statistics
- Signup Data - View all user registrations
- Signin Data - View login records
- Contact Messages - View customer inquiries

### 3. Features Available

#### Signup Data
- View all user signups with their details
- Filter by country, state, gender, age
- Export data to CSV for reporting
- Search functionality (when backend is connected)

#### Signin Data
- Track user login activities
- View IP addresses and user agents
- Export login history to CSV
- Monitor access patterns

#### Contact Messages
- View customer inquiries
- Mark messages as read
- View full message in modal dialog
- Export messages to CSV
- Track unread message count

### 4. Export Data
All data pages have an "Export CSV" button:
- Click the button to download data
- File saved as: data_type.csv
- Compatible with Excel, Google Sheets, etc.

## File Locations

```
📁 Admin Panel Files
├── app/admin/
│   ├── login/page.tsx              ← Admin login
│   ├── dashboard/page.tsx           ← Dashboard
│   ├── signup-data/page.tsx        ← Signup viewer
│   ├── signin-data/page.tsx        ← Signin viewer
│   └── contact-messages/page.tsx   ← Messages viewer
├── app/api/admin/
│   ├── signups/route.ts            ← Signup API
│   ├── signins/route.ts            ← Signin API
│   └── contacts/route.ts           ← Contact API
├── components/
│   ├── AdminSidebar.tsx            ← Navigation
│   └── Footer.tsx                  ← Admin link
└── ADMIN_PANEL.md                  ← Full documentation
```

## Database Integration (Next Steps)

### Signup Schema
```typescript
{
  name: String,
  email: String,
  phone: String,
  countryCode: String,
  country: String,
  state: String,
  gender: String (Male/Female),
  age: Number,
  profession: String,
  password: String (hashed),
  createdAt: Date
}
```

### Signin Logs Schema
```typescript
{
  email: String,
  ipAddress: String,
  userAgent: String,
  loginTime: Date
}
```

### Contact Schema
```typescript
{
  name: String,
  email: String,
  subject: String,
  message: String,
  isRead: Boolean,
  createdAt: Date
}
```

## Security Notes

1. **Never share credentials** - admin/Mohanpk@1010
2. **Tokens are temporary** - Clear browser cache when logging out
3. **API validation** - All endpoints check Bearer token
4. **Password encryption** - Passwords stored as hashes in database

## Troubleshooting

### Can't login
- Check username: "admin" (lowercase)
- Check password: "Mohanpk@1010" (case-sensitive)
- Clear browser cache and try again

### No data showing
- Backend API not connected yet
- Check browser console for errors
- Verify database has records to display

### Export not working
- Check browser pop-up blocker
- Verify data exists in table
- Try different browser if issue persists

## Performance Tips

1. **Pagination** - For large datasets, implement pagination in API
2. **Lazy Loading** - Load data only when tab is opened
3. **Search** - Add search to reduce displayed records
4. **Caching** - Cache API responses for faster navigation
5. **Date Range** - Filter by date to reduce data load

## Mobile Optimization

- Sidebar collapses to hamburger menu on mobile
- Tables become horizontally scrollable
- Buttons stack vertically
- Touch-friendly interface
- Full functionality on all devices

---
**Version:** 1.0
**Created:** December 2025
**Last Updated:** December 11, 2025
