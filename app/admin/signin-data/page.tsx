'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, Menu, X, Download } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface SigninLog {
  _id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  loginTime?: string;
}

const formatSigninTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
};

export default function SigninData() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signinData, setSigninData] = useState<SigninLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');

    if (!adminToken) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      fetchSigninData();
    }
  }, [router]);

  const fetchSigninData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/signins', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setSigninData(data);
      } else {
        setSigninData([]);
      }
    } catch (err) {
      setError('Failed to fetch signin data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleExport = () => {
    const csv = [
      ['Email', 'IP Address', 'User Agent', 'Login Time'].join(','),
      ...signinData.map(log =>
        [
          log.email,
          log.ipAddress ?? 'N/A',
          log.userAgent ?? 'N/A',
          formatSigninTimestamp(log.createdAt ?? log.loginTime)
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signin_data.csv';
    a.click();
  };

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <LogIn className="h-8 w-8 text-purple-600" />
                <span>Signin Data</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          ) : signinData.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <LogIn className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No signin data available yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">IP Address</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">User Agent</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Login Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signinData.map((log, index) => (
                      <tr key={log._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm text-gray-800">{log.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.ipAddress ?? 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{log.userAgent ?? 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatSigninTimestamp(log.createdAt ?? log.loginTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stats Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <p className="text-sm text-gray-600">
                  Total signin logs: <span className="font-semibold text-gray-800">{signinData.length}</span>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
