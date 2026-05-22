'use client';

import { useEffect } from 'react';

export default function AppInitializer() {
  useEffect(() => {
    // All planner data is stored in MongoDB Atlas — no localStorage sync needed.
    // Auth tokens (adminToken, lifePlannerToken, etc.) remain in localStorage — that is intentional.
  }, []);

  return null; // This component doesn't render anything
}
