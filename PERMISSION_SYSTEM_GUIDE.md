# Swar Yoga CRM - Granular Permission System 🔐

## Overview

This document describes the new **granular permission system** implemented for the Swar Yoga Admin CRM. This system provides fine-grained role-based access control (RBAC) for admin users, allowing you to precisely control what each admin can see and do.

## 🎯 What Was Fixed

### Critical Security Issues Resolved

1. **✅ WhatsApp Chat Visibility**: Non-super admins can now only see chats for leads assigned to them
2. **✅ Message Send Restrictions**: Non-super admins cannot send messages to leads not assigned to them
3. **✅ Media Upload Protection**: Media uploads are also restricted to assigned leads only

### Improvements

- **Granular Permissions**: Instead of just "all", "crm", "whatsapp", "email", you now have 17+ modules with read/write/delete control
- **Permission Presets**: Quick presets for common roles (CRM Manager, Sales Rep, Marketing Manager, Analyst)
- **Backward Compatible**: Old permission arrays are automatically migrated to the new system
- **Visual Permission Manager**: Beautiful UI with toggles and checkboxes for easy permission configuration

---

## 📚 Permission System Structure

### Modules

The system includes **17 modules**:

| Module | Description | Actions Available |
|--------|-------------|-------------------|
| **leads** | Lead management | read, write, delete, export, assignToOthers, viewAll |
| **contacts** | Contact management | read, write, delete, export |
| **customers** | Customer management | read, write, delete, export |
| **whatsapp** | WhatsApp messaging | read, send, broadcast, manageGroups, viewMedia |
| **email** | Email messaging | read, send, broadcast, manageTemplates |
| **messages** | General messaging | read, send, delete |
| **broadcasts** | Broadcast campaigns | read, create, send, schedule, delete |
| **templates** | Message templates | read, write, delete |
| **workshops** | Workshop management | read, write, delete, manageRegistrations, viewPayments |
| **payments** | Payment processing | read, write, refund, export |
| **invoices** | Invoice management | read, write, delete, export |
| **analytics** | Analytics & insights | read, export |
| **reports** | Reporting | read, create, export |
| **dashboard** | Dashboard access | read |
| **users** | Admin user management | read, write, delete, managePermissions |
| **settings** | System settings | read, write |
| **auditLogs** | Audit logs | read, export |

### Permission Format

Permissions are stored in two formats:

#### 1. **Legacy Format** (Backward Compatible)
```json
{
  "permissions": ["all"]  // or ["crm", "whatsapp", "email"]
}
```

#### 2. **Granular Format** (New, Recommended)
```json
{
  "permissionsV2": {
    "isSuperAdmin": false,
    "leads": {
      "read": true,
      "write": true,
      "delete": false,
      "export": true,
      "assignToOthers": false,
      "viewAll": false
    },
    "whatsapp": {
      "read": true,
      "send": true,
      "broadcast": false,
      "manageGroups": false,
      "viewMedia": true
    }
  }
}
```

---

## 🎭 Permission Presets

### 1. Super Admin
- **Access**: Full access to everything
- **Use Case**: Trusted administrators, business owners
- **isSuperAdmin**: `true`

### 2. CRM Manager
- **Access**: Manage leads, contacts, customers; send individual messages
- **Cannot**: Broadcast, assign to others, view all leads, delete records
- **Use Case**: Team leads, CRM supervisors

### 3. Sales Representative
- **Access**: View and edit assigned leads, send messages
- **Cannot**: Delete, export, view other's leads, broadcast
- **Use Case**: Sales team members

### 4. Marketing Manager
- **Access**: Broadcasts, campaigns, templates, analytics
- **Cannot**: Delete leads, manage users
- **Use Case**: Marketing team, campaign managers

### 5. Analyst
- **Access**: Read-only access to analytics, reports, payments
- **Cannot**: Modify data, send messages
- **Use Case**: Business analysts, accountants

---

## 🛠 How to Use

### For Super Admins

1. **Access Admin Users Page**: `/admin/users`
2. **Click Edit** on any user
3. **Toggle Permission Mode**:
   - **Granular Permissions** (Recommended): Full control over each module
   - **Legacy View**: Simple checkboxes for CRM/WhatsApp/Email
4. **Choose a Preset** or customize manually
5. **Save Changes**

### For Developers

#### Check Permissions in Code

```typescript
import { hasPermission, canViewAllLeads } from '@/lib/permissions';

// Check specific permission
if (hasPermission(user.permissionsV2, 'leads', 'write')) {
  // Allow lead editing
}

// Check if user can view all leads (not just assigned)
if (canViewAllLeads(user.permissionsV2)) {
  // Show all leads
} else {
  // Filter by assignedToUserId
}
```

#### Get Permission List

```typescript
import { getUserPermissionsList } from '@/lib/permissions';

const permList = getUserPermissionsList(user.permissionsV2);
// Returns: ["leads:read", "leads:write", "whatsapp:send", ...]
```

#### Migrate Legacy Permissions

```typescript
import { migrateOldPermissions } from '@/lib/permissions';

const oldPerms = ["crm", "whatsapp"];
const newPerms = migrateOldPermissions(oldPerms);
// Automatically converts to granular format
```

---

## 📊 Database Schema Changes

### User Schema Updates

```typescript
{
  // DEPRECATED: Legacy permissions (kept for backward compatibility)
  permissions: ['all', 'crm', 'whatsapp', 'email'],
  
  // NEW: Granular permissions (preferred)
  permissionsV2: {
    isSuperAdmin: false,
    leads: { read: true, write: true, ... },
    whatsapp: { read: true, send: true, ... },
    // ... other modules
  },
  
  // NEW: For multi-admin CRM
  assignedLeadIds: ['lead_id_1', 'lead_id_2']
}
```

---

## 🔒 Security Implementation

### WhatsApp QR Page (`/admin/crm/qr`)

**Chat List Filtering** (Line 1403-1420):
```typescript
.filter((chat) => {
  if (isSuperAdmin) return true;
  if (chat.leadId) {
    return assignedLeadIds.has(String(chat.leadId));
  }
  return true; // Allow new contacts but can't message
})
```

**Send Message Protection** (Line 670-673):
```typescript
if (!isSuperAdmin && activeLeadId && !assignedLeadIds.has(activeLeadId)) {
  alert('❌ You can only message customers assigned to you.');
  return;
}
```

**Media Upload Protection** (Line 723-728):
```typescript
if (!isSuperAdmin && activeLeadId && !assignedLeadIds.has(activeLeadId)) {
  alert('❌ You can only send media to customers assigned to you.');
  return;
}
```

### API Endpoint Protection

**Leads API** (`/api/admin/crm/leads`):
```typescript
if (isSuperAdmin) {
  // View all leads
  if (userIdParam) filter.assignedToUserId = userIdParam;
} else {
  // View only assigned leads
  filter.assignedToUserId = viewerUserId;
}
```

---

## 🎨 UI Components

### PermissionManager Component

Located: `components/admin/PermissionManager.tsx`

**Features**:
- Super Admin toggle with visual indicator
- 4 quick preset buttons (CRM Manager, Sales Rep, Marketing Manager, Analyst)
- Collapsible module sections with enable/disable all
- Color-coded permission badges (green = enabled, red = disabled)
- Partial permission warnings (yellow)
- Read-only mode for super admins

**Usage**:
```tsx
import PermissionManager from '@/components/admin/PermissionManager';

<PermissionManager
  initialPermissions={user.permissionsV2}
  onChange={setGranularPermissions}
  disabled={isSaving}
/>
```

---

## 🔄 Migration Guide

### Automatic Migration

When a user with legacy permissions is edited, the system automatically:

1. Detects legacy permission array
2. Calls `migrateOldPermissions(legacyPerms)`
3. Converts to granular format
4. Saves both formats for backward compatibility

### Manual Migration (Script)

To migrate all existing users:

```bash
node scripts/migrate-permissions.js
```

This will:
- Find all admin users with only `permissions` field
- Generate `permissionsV2` from legacy permissions
- Update database records
- Log migration results

---

## 📝 Best Practices

### 1. Always Use Granular Permissions for New Users
Instead of:
```typescript
{ permissions: ['crm', 'whatsapp'] }
```

Use:
```typescript
{ 
  permissionsV2: PERMISSION_PRESETS.CRM_MANAGER 
}
```

### 2. Prefer Permission Checks Over Role Checks

❌ **Bad**:
```typescript
if (user.role === 'admin') {
  // Allow action
}
```

✅ **Good**:
```typescript
if (hasPermission(user.permissionsV2, 'leads', 'delete')) {
  // Allow action
}
```

### 3. Always Check Both Display AND Action Permissions

```typescript
// Hide UI element
{hasPermission(perms, 'leads', 'delete') && (
  <button onClick={deleteLead}>Delete</button>
)}

// Also protect the action
const deleteLead = () => {
  if (!hasPermission(perms, 'leads', 'delete')) {
    alert('Permission denied');
    return;
  }
  // Execute delete
};
```

### 4. Use Presets for Common Roles

Don't manually create permission objects. Use presets:

```typescript
import { PERMISSION_PRESETS } from '@/lib/permissions';

const newUser = {
  ...userDetails,
  permissionsV2: PERMISSION_PRESETS.SALES_REP
};
```

---

## 🐛 Troubleshooting

### User Can't See Their Leads

1. Check `assignedToUserId` in Lead collection
2. Verify `assignedLeadIds` is populated in User document
3. Check `leads.viewAll` permission (should be `false` for non-super admins)

### Permission Changes Not Reflecting

1. Clear browser localStorage: `localStorage.removeItem('admin_user')`
2. Re-login to get fresh JWT token
3. Verify `permissionsV2` field is saved in database

### Legacy Permissions Still Showing

This is normal! Legacy permissions are kept for backward compatibility with older code. New features should use `permissionsV2`.

---

## 📦 Files Modified

### Core Files
- `lib/permissions.ts` - Permission types, presets, helper functions
- `lib/db.ts` - Updated User schema with `permissionsV2` and `assignedLeadIds`
- `components/admin/PermissionManager.tsx` - Visual permission editor

### API Endpoints
- `app/api/admin/auth/users/[id]/route.ts` - Support for `permissionsV2` in PUT
- `app/api/admin/crm/leads/route.ts` - Already had multi-user filtering

### UI Pages
- `app/admin/users/page.tsx` - Integrated PermissionManager component
- `app/admin/crm/qr/page.tsx` - Added chat visibility and send restrictions

---

## 🚀 Next Steps

### Recommended Enhancements

1. **Activity Logging**: Log permission changes in audit logs
2. **Permission Templates**: Allow saving custom permission sets as templates
3. **Bulk Permission Updates**: Update multiple users at once
4. **Permission Reports**: Generate reports on who has access to what
5. **Time-based Permissions**: Set expiration dates on permissions
6. **IP Restrictions**: Limit access by IP address per user
7. **2FA Integration**: Require 2FA for sensitive permissions

### API Endpoints to Protect

Apply permission checks to these endpoints:

- `POST /api/admin/crm/broadcasts` - Check `broadcasts.send`
- `DELETE /api/admin/crm/leads/[id]` - Check `leads.delete`
- `GET /api/admin/analytics` - Check `analytics.read`
- `PUT /api/admin/settings` - Check `settings.write`
- `GET /api/admin/users` - Check `users.read`

---

## 💡 Examples

### Example 1: Create a Custom Sales Manager Role

```typescript
const SALES_MANAGER_PERMISSIONS: UserPermissions = {
  isSuperAdmin: false,
  leads: {
    read: true,
    write: true,
    delete: true, // Can delete leads
    export: true,
    assignToOthers: true, // Can assign leads to sales reps
    viewAll: true, // Can view all leads in the team
  },
  whatsapp: {
    read: true,
    send: true,
    broadcast: true, // Can send broadcasts
    manageGroups: false,
    viewMedia: true,
  },
  customers: {
    read: true,
    write: true,
    delete: false,
    export: true,
  },
  analytics: {
    read: true,
    export: true,
  },
  reports: {
    read: true,
    create: true,
    export: true,
  },
  dashboard: {
    read: true,
  },
};
```

### Example 2: Check Multiple Permissions

```typescript
const canManageLeads = (userPerms: UserPermissions) => {
  return (
    hasPermission(userPerms, 'leads', 'read') &&
    hasPermission(userPerms, 'leads', 'write')
  );
};

const canSendCampaigns = (userPerms: UserPermissions) => {
  return (
    hasPermission(userPerms, 'broadcasts', 'send') ||
    hasPermission(userPerms, 'email', 'broadcast')
  );
};
```

### Example 3: Filter Data Based on Permissions

```typescript
const getAccessibleLeads = async (userId: string, userPerms: UserPermissions) => {
  const Lead = getLead();
  
  if (canViewAllLeads(userPerms)) {
    // Super admin or has viewAll permission
    return await Lead.find({}).exec();
  } else {
    // Regular admin - only assigned leads
    return await Lead.find({ assignedToUserId: userId }).exec();
  }
};
```

---

## 📞 Support

For questions or issues with the permission system:

1. Check this documentation first
2. Review `lib/permissions.ts` for helper functions
3. Test with a non-super-admin account
4. Check browser console for permission errors
5. Verify database records have correct `permissionsV2` structure

---

## ✅ Testing Checklist

Before deploying to production:

- [ ] Create a test user with Sales Rep preset
- [ ] Verify they can only see assigned leads
- [ ] Attempt to message a non-assigned lead (should fail)
- [ ] Verify super admin can see all leads
- [ ] Test permission preset switching
- [ ] Verify legacy permissions are migrated correctly
- [ ] Check audit logs for permission changes
- [ ] Test with multiple concurrent admin users
- [ ] Verify permission API endpoints return correct data
- [ ] Test permission manager UI in all browsers

---

**Last Updated**: January 2025
**Version**: 2.0.0
**Author**: Swar Yoga Development Team
