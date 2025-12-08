// Mock authentication data API

interface SignUpData {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  country: string;
  state: string;
  gender: string;
  age: number;
  profession: string;
  source: 'signup' | 'signin' | 'manual' | 'csv_upload';
}

interface SignInData {
  email: string;
  name?: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
}

// Get signup data from backend API
const getSignUpData = async (): Promise<any[]> => {
  try {
    const response = await fetch('/api/admin/signup-data');
    if (!response.ok) throw new Error('Failed to fetch signup data');
    const json = await response.json();
    // Handle both direct array response and wrapped { data: [] } response
    return json.data || json;
  } catch (error) {
    console.error('Error fetching signup data from backend:', error);
    // Fallback to localStorage
    try {
      const data = localStorage.getItem('signup_data');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error getting signup data from localStorage:', e);
      return [];
    }
  }
};

// Get signin data from backend API
const getSignInData = async (): Promise<any[]> => {
  try {
    const response = await fetch('/api/admin/signin-data');
    if (!response.ok) throw new Error('Failed to fetch signin data');
    const json = await response.json();
    // Handle both direct array response and wrapped { data: [] } response
    return json.data || json;
  } catch (error) {
    console.error('Error fetching signin data from backend:', error);
    // Fallback to localStorage
    try {
      const data = localStorage.getItem('signin_data');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error getting signin data from localStorage:', e);
      return [];
    }
  }
};

// Sample data removed - using real data from backend API only

// Initialize auth data if empty
const initializeAuthData = async () => {
  // Data is now managed by the backend, no need for local initialization
  try {
    await getSignUpData();
    await getSignInData();
  } catch (error) {
    console.error('Error initializing auth data:', error);
  }
};

// Auth API methods
export const authAPI = {
  // Get signup data from backend
  getSignUpData: async (): Promise<any[]> => {
    return getSignUpData();
  },
  
  // Get signin data from backend
  getSignInData: async (): Promise<any[]> => {
    return getSignInData();
  },
  
  // Record a new signup
  recordSignUp: async (userData: SignUpData): Promise<any> => {
    try {
      const response = await fetch('/api/auth/record-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Failed to record signup');
      return await response.json();
    } catch (error) {
      console.error('Error recording signup:', error);
      // Fallback to localStorage
      const data = JSON.parse(localStorage.getItem('signup_data') || '[]');
      const newUser = {
        id: Date.now(),
        ...userData,
        registrationDate: new Date().toISOString(),
        status: 'active'
      };
      data.push(newUser);
      localStorage.setItem('signup_data', JSON.stringify(data));
      return newUser;
    }
  },
  
  // Record a new signin
  recordSignIn: async (signinData: SignInData): Promise<any> => {
    try {
      const response = await fetch('/api/auth/record-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signinData)
      });
      if (!response.ok) throw new Error('Failed to record signin');
      return await response.json();
    } catch (error) {
      console.error('Error recording signin:', error);
      // Fallback to localStorage
      const data = JSON.parse(localStorage.getItem('signin_data') || '[]');
      const newSignin = {
        id: Date.now(),
        email: signinData.email,
        timestamp: new Date().toISOString(),
        ip: signinData.ipAddress,
        device: signinData.userAgent,
        status: signinData.success ? 'success' : 'failed'
      };
      data.push(newSignin);
      localStorage.setItem('signin_data', JSON.stringify(data));
      return newSignin;
    }
  },
  
  // Add user manually (for admin)
  addUserManually: async (userData: Omit<SignUpData, 'source'>): Promise<any> => {
    try {
      const response = await fetch('/api/auth/record-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, source: 'manual' })
      });
      if (!response.ok) throw new Error('Failed to add user');
      return await response.json();
    } catch (error) {
      console.error('Error adding user:', error);
      // Fallback to localStorage
      const data = JSON.parse(localStorage.getItem('signup_data') || '[]');
      const newUser = {
        id: Date.now(),
        ...userData,
        registrationDate: new Date().toISOString(),
        status: 'active',
        source: 'manual'
      };
      data.push(newUser);
      localStorage.setItem('signup_data', JSON.stringify(data));
      return newUser;
    }
  },
  
  // Clear signup data (for testing)
  clearSignUpData: async (): Promise<void> => {
    try {
      // Backend doesn't have a clear endpoint yet, using localStorage
      localStorage.setItem('signup_data', JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing signup data:', error);
    }
  },
  
  // Clear signin data (for testing)
  clearSignInData: async (): Promise<void> => {
    try {
      // Backend doesn't have a clear endpoint yet, using localStorage
      localStorage.setItem('signin_data', JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing signin data:', error);
    }
  }
};