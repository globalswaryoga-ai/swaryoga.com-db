'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Goals page has been merged into Action Plan dashboard
 * This page redirects to /life-planner/dashboard/action-plan
 */
export default function GoalsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/life-planner/dashboard/action-plan');
  }, [router]);

  return null;
}
