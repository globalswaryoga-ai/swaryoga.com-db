'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRoot() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated by looking for token
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    
    if (token) {
      // If authenticated, redirect to dashboard
      router.push('/admin/dashboard');
    } else {
      // If not authenticated, redirect to login
      router.push('/admin/login');
    }
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <div className="text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-300 border-t-white mb-4"></div>
        </div>
        <h1 className="text-white text-2xl font-semibold">Loading Admin Panel...</h1>
      </div>
    </div>
  );
}
