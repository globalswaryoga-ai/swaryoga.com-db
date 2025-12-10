'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, LogOut, Menu, X } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminUser, setAdminUser] = useState('');

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    const adminUsername = localStorage.getItem('adminUser');

    if (!adminToken) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      setAdminUser(adminUsername || '');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
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
                <LayoutDashboard className="h-8 w-8 text-blue-600" />
                <span>Dashboard</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back</p>
                <p className="font-semibold text-gray-800 capitalize">{adminUser}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                title="Logout"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Stats Cards */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Signups</p>
                  <p className="text-3xl font-bold text-gray-800">--</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Logins</p>
                  <p className="text-3xl font-bold text-gray-800">--</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Contact Messages</p>
                  <p className="text-3xl font-bold text-gray-800">--</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-800">--</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Admin Panel</h2>
            <p className="text-gray-600 mb-4">
              Use the sidebar to navigate through different sections of the admin panel.
            </p>
            <ul className="text-gray-600 space-y-2 ml-4">
              <li>📊 <strong>Dashboard:</strong> View overview statistics</li>
              <li>👥 <strong>Signup Data:</strong> View all user registrations</li>
              <li>🔑 <strong>Signin Data:</strong> View user login records</li>
              <li>💬 <strong>Contact Messages:</strong> View customer inquiries</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
