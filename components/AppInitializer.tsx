'use client';

import { useEffect } from 'react';
import { permanentStorage } from '@/lib/permanentStorageManager';

export default function AppInitializer() {
  useEffect(() => {
    // Clear any old auto-login data for security
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPhone');
      localStorage.removeItem('userCountryCode');
      localStorage.removeItem('sessionExpiry');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    // Initialize permanent storage with auto-sync
    permanentStorage.initialize();

    // Cleanup on unmount
    return () => {
      permanentStorage.destroy();
    };
  }, []);

  return null; // This component doesn't render anything
}
