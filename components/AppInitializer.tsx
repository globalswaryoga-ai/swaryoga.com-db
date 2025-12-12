'use client';

import { useEffect } from 'react';
import { initializeAutoLogin } from '@/lib/autoLoginManager';
import { permanentStorage } from '@/lib/permanentStorageManager';

export default function AppInitializer() {
  useEffect(() => {
    // Initialize auto-login on app startup
    initializeAutoLogin();

    // Initialize permanent storage with auto-sync
    permanentStorage.initialize();

    // Cleanup on unmount
    return () => {
      permanentStorage.destroy();
    };
  }, []);

  return null; // This component doesn't render anything
}
