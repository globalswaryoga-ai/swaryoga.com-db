/**
 * CRM Addons Management Page
 * Central hub for all addon management
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { CRMAddonsManager } from '@/components/admin/crm/CRMAddonsManager';

export default function AddonsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Extend Swaryoga CRM</h1>
          <p className="text-lg text-gray-600">
            Enable, disable, and manage all your CRM features in one place
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <CRMAddonsManager />
        </div>

        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold text-gray-900 mb-2">💡 Easy Toggle</h3>
            <p className="text-sm text-gray-600">
              Enable or disable features with a single click
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold text-gray-900 mb-2">🔄 Hot Swap</h3>
            <p className="text-sm text-gray-600">
              No server restart needed - changes apply instantly
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold text-gray-900 mb-2">🚀 Scalable</h3>
            <p className="text-sm text-gray-600">
              Add new addons anytime - fully extensible architecture
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
