// Session Manager - Handles 2-day login persistence
const SESSION_EXPIRY_KEY = 'sessionExpiry';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const SESSION_DURATION_DAYS = 2;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000; // 2 days in milliseconds

export interface SessionData {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    countryCode?: string;
  };
}

/**
 * Set session with 2-day expiry
 * Call this after successful login
 */
export const setSession = (sessionData: SessionData): void => {
  if (typeof window === 'undefined') return; // Only run on client

  try {
    // Calculate expiry time (2 days from now)
    const expiryTime = Date.now() + SESSION_DURATION_MS;

    // Store session data
    localStorage.setItem(TOKEN_KEY, sessionData.token);
    localStorage.setItem(USER_KEY, JSON.stringify(sessionData.user));
    localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());

    // Also store individual fields for backward compatibility
    localStorage.setItem('userName', sessionData.user.name);
    localStorage.setItem('userEmail', sessionData.user.email);
    if (sessionData.user.phone) {
      localStorage.setItem('userPhone', sessionData.user.phone);
    }
    if (sessionData.user.countryCode) {
      localStorage.setItem('userCountryCode', sessionData.user.countryCode);
    }
  } catch (error) {
    console.error('Failed to set session:', error);
  }
};

/**
 * Get session if it's still valid
 * Returns null if session has expired
 */
export const getSession = (): SessionData | null => {
  if (typeof window === 'undefined') return null; // Only run on client

  try {
    const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
    
    // Check if session has expired
    if (!expiryTime || Date.now() > parseInt(expiryTime)) {
      clearSession(); // Clear expired session
      return null;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (!token || !userStr) {
      return null;
    }

    return {
      token,
      user: JSON.parse(userStr)
    };
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

/**
 * Check if user is logged in (session is valid)
 */
export const isLoggedIn = (): boolean => {
  return getSession() !== null;
};

/**
 * Get remaining session time in milliseconds
 * Returns 0 if session is expired or doesn't exist
 */
export const getRemainingSessionTime = (): number => {
  if (typeof window === 'undefined') return 0;

  try {
    const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!expiryTime) return 0;

    const remaining = parseInt(expiryTime) - Date.now();
    return Math.max(0, remaining);
  } catch (error) {
    console.error('Failed to get remaining session time:', error);
    return 0;
  }
};

/**
 * Extend session by 2 more days
 * Useful for keeping user logged in if they're active
 */
export const extendSession = (): void => {
  if (typeof window === 'undefined') return;

  try {
    const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (expiryTime) {
      const newExpiryTime = Date.now() + SESSION_DURATION_MS;
      localStorage.setItem(SESSION_EXPIRY_KEY, newExpiryTime.toString());
    }
  } catch (error) {
    console.error('Failed to extend session:', error);
  }
};

/**
 * Clear session (logout)
 */
export const clearSession = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userCountryCode');
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

/**
 * Get formatted remaining time (e.g., "1 day 23 hours")
 */
export const getFormattedRemainingTime = (): string => {
  const remaining = getRemainingSessionTime();
  
  if (remaining <= 0) return 'Expired';

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
};
