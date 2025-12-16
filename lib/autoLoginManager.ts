// Auto-Login Manager - DISABLED
// This functionality has been disabled for security purposes

const AUTO_LOGIN_EMAIL = 'swarsakshi9@gmail.com';
const AUTO_LOGIN_USER = {
  id: 'auto-login-user-swar-sakshi',
  name: 'Swar Sakshi',
  email: 'swarsakshi9@gmail.com',
  phone: '9876543210',
  countryCode: '+91'
};

/**
 * Initialize auto-login - DISABLED
 */
export const initializeAutoLogin = (): void => {
  // Auto-login has been disabled for security purposes
  // Users must authenticate properly
};

/**
 * Auto-login swarsakshi9@gmail.com - DISABLED
 */
export const autoLoginUser = (): void => {
  // Auto-login has been disabled for security purposes
};

/**
 * Check if current user is the auto-login user
 */
export const isAutoLoginUser = (): boolean => {
  // Auto-login has been disabled
  return false;
};

/**
 * Get auto-login user info
 */
export const getAutoLoginUser = () => {
  return null;
};

/**
 * Check if logout should be prevented (for auto-login user)
 */
export const shouldPreventLogout = (): boolean => {
  // Auto-login has been disabled - logout is allowed
  return false;
};
