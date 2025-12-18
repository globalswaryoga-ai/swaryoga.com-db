'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Todo page removed. Todos are now managed inside Tasks Plan.
 */
export default function TodosPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/life-planner/dashboard/tasks');
  }, [router]);

  return null;
}
