'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LifePlannerLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main unified sign-in with return URL
    router.replace('/signin?redirect=/life-planner/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-sans">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold">Redirecting to Swar Yoga Sign In...</p>
      </div>
    </div>
  );
}
