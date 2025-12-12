// Auto-Login Manager for swarsakshi9@gmail.com
// This user will always remain signed in

const AUTO_LOGIN_EMAIL = 'swarsakshi9@gmail.com';
const AUTO_LOGIN_USER = {
  id: 'auto-login-user-swar-sakshi',
  name: 'Swar Sakshi',
  email: 'swarsakshi9@gmail.com',
  phone: '9876543210',
  countryCode: '+91'
};

/**
 * Initialize auto-login for swarsakshi9@gmail.com
 * Call this on app startup (in root layout or app initialization)
 */
export const initializeAutoLogin = (): void => {
  if (typeof window === 'undefined') return; // Only run on client

  try {
    const storedUser = localStorage.getItem('user');
    
    // If no user is logged in, auto-login swarsakshi9@gmail.com
    if (!storedUser) {
      autoLoginUser();
    }
  } catch (error) {
    console.error('Failed to initialize auto-login:', error);
  }
};

/**
 * Auto-login swarsakshi9@gmail.com
 * This creates a session without requiring password
 */
export const autoLoginUser = (): void => {
  if (typeof window === 'undefined') return;

  try {
    // Create a mock token for auto-login user
    const mockToken = `auto-login-token-${Date.now()}`;
    
    // Store user data
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(AUTO_LOGIN_USER));
    localStorage.setItem('userName', AUTO_LOGIN_USER.name);
    localStorage.setItem('userEmail', AUTO_LOGIN_USER.email);
    localStorage.setItem('userPhone', AUTO_LOGIN_USER.phone);
    localStorage.setItem('userCountryCode', AUTO_LOGIN_USER.countryCode);

    // Set session expiry to 30 days (longer for auto-login)
    const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
    localStorage.setItem('sessionExpiry', expiryTime.toString());

    console.log('Auto-login activated for swarsakshi9@gmail.com');
  } catch (error) {
    console.error('Failed to auto-login user:', error);
  }
};

/**
 * Check if current user is the auto-login user
 */
export const isAutoLoginUser = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    return user.email === AUTO_LOGIN_EMAIL;
  } catch (error) {
    return false;
  }
};

/**
 * Get auto-login user info
 */
export const getAutoLoginUser = () => {
  return AUTO_LOGIN_USER;
};

/**
 * Check if logout should be prevented (for auto-login user)
 */
export const shouldPreventLogout = (): boolean => {
  return isAutoLoginUser();
};
