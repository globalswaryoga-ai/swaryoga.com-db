'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LifePlannerPage() {
  const router = useRouter();

  useEffect(() => {
    // Login is mandatory. If authenticated, show dashboard; otherwise show login page.
    // Support both unified session (token/user) and life-planner legacy keys.
    const token = localStorage.getItem('lifePlannerToken') || localStorage.getItem('token');
    const user = localStorage.getItem('lifePlannerUser') || localStorage.getItem('user');

    if (token && user) {
      router.replace('/life-planner/dashboard');
      return;
    }

    router.replace('/life-planner/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-sm text-swar-text-secondary">Opening Life Planner…</div>
    </div>
  );
}
