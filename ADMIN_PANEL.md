# Admin Panel Documentation

## Overview
A complete admin panel system has been created for managing Swar Yoga platform data including user signups, signins, and contact messages.

## Features

### 1. Admin Login Page
**Location:** `/admin/login`
**Credentials:**
- Username: `admin`
- Password: `Mohanpk@1010`

**Features:**
- Secure login with validation
- Password visibility toggle
- Error handling and success messages
- Loading state during submission
- Demo credentials display
- Session storage using localStorage

### 2. Admin Dashboard
**Location:** `/admin/dashboard`
**Features:**
- Welcome overview with statistics cards
- Quick navigation guide
- Responsive sidebar with menu collapse
- User session display with logout button
- Mobile-friendly layout with hamburger menu

### 3. Sidebar Navigation
The sidebar provides quick access to:
- **Dashboard** - Main admin overview
- **Signup Data** - View all user registrations
- **Signin Data** - View user login history
- **Contact Messages** - View customer inquiries

**Features:**
- Collapsible on mobile devices
- Icon-based navigation
- Active state indicators
- Quick access from any admin page

### 4. Signup Data Page
**Location:** `/admin/signup-data`
**Features:**
- Display all signup records in table format
- Columns: Name, Email, Phone, Country, State, Gender, Age, Profession, Date
- Export to CSV functionality
- Total signup count
- Empty state handling
- Loading and error states

### 5. Signin Data Page
**Location:** `/admin/signin-data`
**Features:**
- Display all signin records in table format
- Columns: Email, IP Address, User Agent, Login Time
- Export to CSV functionality
- Total signin count
- Empty state handling
- Loading and error states

### 6. Contact Messages Page
**Location:** `/admin/contact-messages`
**Features:**
- Display all contact inquiries in table format
- Read/Unread status badges
- View full message in modal dialog
- Mark messages as read
- Export to CSV functionality
- Message count and unread badge
- Empty state handling

### 7. Admin Button in Footer
**Location:** Footer component (visible on all pages)
**Features:**
- Quick access link to admin login
- Styled with blue button design
- Lock icon for security indication
- Visible to all visitors

## Backend API Endpoints

### 1. Signup Data Endpoint
**URL:** `/api/admin/signups`
**Method:** GET
**Headers:** Authorization: Bearer {token}
**Response:** Array of signup records

### 2. Signin Data Endpoint
**URL:** `/api/admin/signins`
**Method:** GET
**Headers:** Authorization: Bearer {token}
**Response:** Array of signin logs

### 3. Contact Messages Endpoint
**URL:** `/api/admin/contacts`
**Method:** GET
**Headers:** Authorization: Bearer {token}
**Response:** Array of contact messages

## File Structure

```
app/
  admin/
    login/page.tsx           - Admin login page
    dashboard/page.tsx       - Admin dashboard
    signup-data/page.tsx     - Signup data viewer
    signin-data/page.tsx     - Signin data viewer
    contact-messages/page.tsx - Contact messages viewer
  api/
    admin/
      signups/route.ts       - Signup data API
      signins/route.ts       - Signin data API
      contacts/route.ts      - Contact messages API

components/
  AdminSidebar.tsx           - Sidebar navigation component
  Footer.tsx                 - Updated with admin button
```

## Security Features

1. **Token-based Authentication**
   - Admin token stored in localStorage
   - Token validation on protected routes
   - Automatic redirect to login if token is missing

2. **Password Protection**
   - Credentials required: admin / Mohanpk@1010
   - Password field with show/hide toggle

3. **Authorization Headers**
   - All API endpoints require Bearer token
   - 401 response for missing/invalid tokens

## Responsive Design

- **Desktop:** Full sidebar always visible, complete data tables
- **Tablet:** Collapsible sidebar, optimized table layout
- **Mobile:** Hamburger menu, compact views, export buttons

## Data Export

All data pages include CSV export functionality:
- Signup data → `signup_data.csv`
- Signin data → `signin_data.csv`
- Contact messages → `contact_messages.csv`

## User Experience

### Logout Functionality
- Red logout button in header (all admin pages)
- Clears localStorage tokens
- Redirects to login page
- Session-based authentication

### Empty States
- Clear messaging when no data is available
- Icon indicators for different data types
- Encouraging descriptions

### Loading States
- Animated spinner during data fetch
- Prevents interaction during loading
- User-friendly feedback

## Next Steps for Full Integration

1. **Database Schema Updates**
   - Add login/signin tracking to User model
   - Ensure Contact model includes `isRead` field
   - Add timestamps to all relevant models

2. **API Implementation**
   - Query and return actual database records
   - Implement pagination for large datasets
   - Add filtering and sorting capabilities

3. **Advanced Features**
   - Search functionality
   - Date range filters
   - Delete/archive messages
   - User profile management
   - Admin activity logs

## Testing the Admin Panel

1. Visit `/admin/login`
2. Enter username: `admin`
3. Enter password: `Mohanpk@1010`
4. Click "Admin Login"
5. Explore dashboard and data pages
6. Use CSV export to test data download
7. Click logout to test session clearing
