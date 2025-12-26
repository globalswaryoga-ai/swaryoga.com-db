'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
    let permissions: string[] = [];

    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = (u?.userId as string) || resolvedUserId;
        permissions = Array.isArray(u?.permissions) ? u.permissions : [];
      } catch {
        // ignore
      }
    }

    const isSuperAdmin = resolvedUserId === 'admin' || permissions.includes('all');

    // Requirement:
    // - Users management is now handled inside the Dashboard (header -> Add Users).
    // - This route should behave like CRM dashboard for permission access.
    if (isSuperAdmin) {
      router.replace('/admin/dashboard?addUsers=1');
    } else {
      router.replace('/admin/crm');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-300">Redirecting...</p>
      </div>
    </div>
  );
}
