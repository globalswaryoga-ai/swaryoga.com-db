# 2-Day Login Session System

## Overview
Users no longer need to login every time. After signing in once, they will **remain logged in for 2 days** (48 hours) without needing to re-authenticate.

## Features

✅ **2-Day Auto-Login:** Users stay logged in for 2 days after successful sign-in/sign-up
✅ **Session Expiry Management:** Automatic session expiration after 2 days
✅ **Session Extension:** Extend session by 2 more days on user activity (optional)
✅ **Local Session Status:** Check session validity anytime
✅ **Formatted Time Display:** Show remaining session time to users
✅ **Page Protection:** Easily protect pages that require authentication

## Implementation Details

### Core Files

1. **`/lib/sessionManager.ts`**
   - Main session management utility
   - Handles setting, getting, and clearing sessions
   - Calculates and manages 2-day expiry

2. **`/lib/useSession.ts`**
   - React hooks for session management
   - `useSession()` - Check if user is logged in
   - `useProtectedPage()` - Protect pages that require authentication

3. **Updated Login Pages**
   - `/app/signin/page.tsx` - Uses `setSession()` instead of manual localStorage
   - `/app/signup/page.tsx` - Uses `setSession()` instead of manual localStorage

## Usage Examples

### 1. Check if User is Logged In

```typescript
import { getSession, isLoggedIn } from '@/lib/sessionManager';

// Simple check
if (isLoggedIn()) {
  console.log('User is logged in!');
}

// Get full session data
const session = getSession();
if (session) {
  console.log('User:', session.user.name);
  console.log('Token:', session.token);
}
```

### 2. In React Components - Check Session Status

```typescript
'use client';
import { useSession } from '@/lib/useSession';

export default function MyComponent() {
  const { isLoggedIn, session, formattedTime, isChecking } = useSession();

  if (isChecking) return <div>Loading...</div>;

  if (!isLoggedIn) {
    return <div>Please log in to access this feature.</div>;
  }

  return (
    <div>
      <p>Welcome, {session?.user.name}!</p>
      <p>Your session expires in: {formattedTime}</p>
    </div>
  );
}
```

### 3. Protect a Whole Page

```typescript
'use client';
import { useProtectedPage } from '@/lib/useSession';

export default function ProtectedPage() {
  const { isLoggedIn, isChecking } = useProtectedPage();

  if (isChecking || !isLoggedIn) return null; // Redirects automatically

  return (
    <div>
      <h1>This page requires login</h1>
      {/* Your protected content */}
    </div>
  );
}
```

### 4. Get Remaining Session Time

```typescript
import { getRemainingSessionTime, getFormattedRemainingTime } from '@/lib/sessionManager';

// Get in milliseconds
const remainingMs = getRemainingSessionTime();
console.log(`Session expires in ${remainingMs / 1000 / 60} minutes`);

// Get formatted string
const formatted = getFormattedRemainingTime();
console.log(`Session expires in ${formatted}`); // e.g., "1 day 23 hours"
```

### 5. Extend Session (Keep User Logged In)

```typescript
import { extendSession } from '@/lib/sessionManager';

// When user is active, extend their session by 2 more days
function onUserActivity() {
  extendSession();
}

// Or use automatic extension with activity tracking
useEffect(() => {
  const handleActivity = () => {
    extendSession();
  };

  window.addEventListener('mousemove', handleActivity);
  window.addEventListener('keypress', handleActivity);

  return () => {
    window.removeEventListener('mousemove', handleActivity);
    window.removeEventListener('keypress', handleActivity);
  };
}, []);
```

### 6. Logout (Clear Session)

```typescript
import { clearSession } from '@/lib/sessionManager';

function handleLogout() {
  clearSession();
  router.push('/signin');
}
```

## Session Storage Structure

Session data is stored in localStorage with expiry tracking:

```javascript
// Stored in localStorage:
{
  token: "jwt-token-here",
  user: {
    id: "user123",
    name: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    countryCode: "+91"
  },
  sessionExpiry: 1702569600000  // Unix timestamp (2 days from login)
}
```

## Session Duration

- **Login Duration:** 2 days (48 hours)
- **Check Interval:** Every 60 seconds (can be customized)
- **Auto Cleanup:** Expired sessions are automatically removed

## API Integration

The system works with your existing `/api/auth/login` and `/api/auth/signup` endpoints.

**No API changes needed** - just ensure responses include:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "countryCode": "+91"
  }
}
```

## Troubleshooting

### Session Not Persisting?
- Check browser localStorage is enabled
- Verify login API returns `token` and `user` fields
- Check browser DevTools → Application → localStorage

### Session Expired Unexpectedly?
- Browser was closed/storage cleared
- User cleared browser data
- 2-day period has elapsed

### User Stays Logged In Beyond 2 Days?
- Call `extendSession()` to add 2 more days
- Or implement `clearSession()` on logout

## Future Enhancements

1. **Activity-Based Extension:** Automatically extend session if user is active
2. **Session History:** Track login times and sessions
3. **Device Management:** Log out specific devices
4. **Token Refresh:** Backend-based token refresh mechanism
5. **Session Analytics:** Monitor session duration and patterns

## Configuration

To change session duration, edit `/lib/sessionManager.ts`:

```typescript
const SESSION_DURATION_DAYS = 2;  // Change this value
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
```

## Security Notes

- Session data is stored in browser localStorage (not secure for highly sensitive apps)
- For production, consider:
  - HTTP-only cookies instead of localStorage
  - Backend session validation
  - CSRF protection
  - Token refresh mechanisms
- Always use HTTPS in production
