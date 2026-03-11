/**
 * 404 Not Found page
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/admin/crm"
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors border border-gray-200"
          >
            CRM Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
