'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LifePlannerProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Single shared profile for the whole site.
    // Support both session formats (token/user) and legacy Life Planner keys.
    const token = localStorage.getItem('token') || localStorage.getItem('lifePlannerToken');
    const user = localStorage.getItem('user') || localStorage.getItem('lifePlannerUser');

    if (!token || !user) {
      router.replace('/signin?redirect=/profile');
      return;
    }

    router.replace('/profile');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-sm text-swar-text-secondary">Opening profile…</div>
    </div>
  );
}
