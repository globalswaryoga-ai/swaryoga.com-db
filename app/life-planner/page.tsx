'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LifePlannerPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('lifePlannerUser');
    
    if (user) {
      // If logged in, redirect to dashboard
      router.push('/life-planner/dashboard');
    } else {
      // If not logged in, redirect to login
      router.push('/life-planner/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <p className="text-gray-600">Loading Life Planner...</p>
      </div>
    </div>
  );
}
