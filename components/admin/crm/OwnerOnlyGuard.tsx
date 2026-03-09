'use client';

import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Full-page access denied screen for owner-only pages.
 * Shows a professional message and routes users back to the dashboard.
 */
export default function OwnerOnlyGuard({ pageName = 'this page' }: { pageName?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 mb-6">
          Only the account owner can access {pageName}. This page contains sensitive data
          like personal WhatsApp conversations and connections.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          If you need access, please contact your account administrator.
        </p>
        <Link
          href="/admin/crm"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
