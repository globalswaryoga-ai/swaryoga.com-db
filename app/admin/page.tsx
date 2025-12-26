'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, LogOut, Settings } from 'lucide-react';

export default function AdminRoot() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('admin_token') || localStorage.getItem('adminToken'))
      : null;
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setAdminUser(user.userId || 'Admin');
        } catch (e) {
          setAdminUser('Admin');
        }
      } else {
        // Fallback to the other admin user key used in some pages.
        const legacyUser = localStorage.getItem('adminUser');
        if (legacyUser) setAdminUser(legacyUser);
      }
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Swar Yoga Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">Welcome, <span className="text-blue-400 font-semibold">{adminUser}</span></span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Hub Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dashboard Card */}
          <Link href="/admin/dashboard">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition transform hover:scale-105">
              <div className="flex items-center gap-4 mb-4">
                <LayoutDashboard size={40} className="text-white" />
                <h2 className="text-3xl font-bold text-white">Dashboard</h2>
              </div>
              <p className="text-blue-100 text-lg">
                Manage orders, users, view statistics, and manage website content.
              </p>
              <div className="mt-6 text-blue-100 font-semibold">→ Go to Dashboard</div>
            </div>
          </Link>

          {/* CRM Card */}
          <Link href="/admin/crm">
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition transform hover:scale-105">
              <div className="flex items-center gap-4 mb-4">
                <Users size={40} className="text-white" />
                <h2 className="text-3xl font-bold text-white">CRM</h2>
              </div>
              <p className="text-green-100 text-lg">
                Manage leads, send messages, handle WhatsApp communication, and templates.
              </p>
              <div className="mt-6 text-green-100 font-semibold">→ Go to CRM</div>
            </div>
          </Link>

          {/* Manage Admin Users Card */}
          <Link href="/admin/users">
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition transform hover:scale-105">
              <div className="flex items-center gap-4 mb-4">
                <Settings size={40} className="text-white" />
                <h2 className="text-3xl font-bold text-white">Admin Users</h2>
              </div>
              <p className="text-purple-100 text-lg">
                Create and manage admin users with custom permissions (CRM, WhatsApp, Email).
              </p>
              <div className="mt-6 text-purple-100 font-semibold">→ Manage Users</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
