'use client';

import { useEffect } from 'react';
import { permanentStorage } from '@/lib/permanentStorageManager';

export default function AppInitializer() {
  useEffect(() => {
    // DISABLED: Auto-logout on every page load was causing user sessions to clear
    // Users should stay logged in until they manually logout
    // Only initialize permanent storage without clearing auth tokens
    
    // Initialize permanent storage with auto-sync
    permanentStorage.initialize();

    // Cleanup on unmount
    return () => {
      permanentStorage.destroy();
    };
  }, []);

  return null; // This component doesn't render anything
}
