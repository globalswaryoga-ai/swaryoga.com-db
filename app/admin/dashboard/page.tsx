'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, LogOut, Menu, X, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import ServerStatus from '@/components/ServerStatus';

interface DashboardData {
  totalUsers: number;
  totalSignins: number;
  totalMessages: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalAmountUSD: number;
  currencyBreakdown: {
    INR: number;
    USD: number;
    NPR: number;
  };
  orders: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    transactionId: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminUser, setAdminUser] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    totalSignins: 0,
    totalMessages: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalAmountUSD: 0,
    currencyBreakdown: { INR: 0, USD: 0, NPR: 0 },
    orders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    const adminUsername = localStorage.getItem('adminUser');

    if (!adminToken) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      setAdminUser(adminUsername || '');
      fetchDashboardData(adminToken);
    }
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

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
              <ServerStatus />
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
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Users</p>
                      <p className="text-3xl font-bold text-gray-800">{dashboardData.totalUsers}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Total Logins */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Logins</p>
                      <p className="text-3xl font-bold text-gray-800">{dashboardData.totalSignins}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Contact Messages */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Messages</p>
                      <p className="text-3xl font-bold text-gray-800">{dashboardData.totalMessages}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Users className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </div>

                {/* Total Orders */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Orders</p>
                      <p className="text-3xl font-bold text-gray-800">{dashboardData.totalOrders}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <ShoppingCart className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Revenue USD */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Total Revenue (USD)</p>
                      <p className="text-3xl font-bold">${dashboardData.totalAmountUSD.toFixed(2)}</p>
                      <p className="text-sm text-green-100 mt-2">Completed Orders: {dashboardData.completedOrders}</p>
                    </div>
                    <div className="p-3 bg-white bg-opacity-20 rounded-full">
                      <DollarSign className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* Completed Orders */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Completed Orders</p>
                      <p className="text-3xl font-bold">{dashboardData.completedOrders}</p>
                      <p className="text-sm text-blue-100 mt-2">Pending: {dashboardData.pendingOrders}</p>
                    </div>
                    <div className="p-3 bg-white bg-opacity-20 rounded-full">
                      <ShoppingCart className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* Pending Orders */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Pending Orders</p>
                      <p className="text-3xl font-bold">{dashboardData.pendingOrders}</p>
                      <p className="text-sm text-orange-100 mt-2">Need Attention</p>
                    </div>
                    <div className="p-3 bg-white bg-opacity-20 rounded-full">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* INR Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Indian Rupees (INR)</h3>
                  <p className="text-3xl font-bold text-gray-800">₹{dashboardData.currencyBreakdown.INR.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {dashboardData.orders.filter(o => o.currency === 'INR').length} orders
                  </p>
                </div>

                {/* USD Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">US Dollar (USD)</h3>
                  <p className="text-3xl font-bold text-gray-800">${dashboardData.currencyBreakdown.USD.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {dashboardData.orders.filter(o => o.currency === 'USD').length} orders
                  </p>
                </div>

                {/* NPR Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Nepali Rupees (NPR)</h3>
                  <p className="text-3xl font-bold text-gray-800">Rs{dashboardData.currencyBreakdown.NPR.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {dashboardData.orders.filter(o => o.currency === 'NPR').length} orders
                  </p>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800">Recent Completed Orders</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Currency</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-600">
                            No completed orders yet
                          </td>
                        </tr>
                      ) : (
                        dashboardData.orders.slice(0, 10).map((order) => (
                          <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                              {order.currency === 'INR' && '₹'}
                              {order.currency === 'USD' && '$'}
                              {order.currency === 'NPR' && 'Rs'}
                              {order.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{order.currency}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 font-mono">{order.transactionId || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info Section */}
              <div className="mt-8 bg-white rounded-lg shadow p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard Overview</h2>
                <p className="text-gray-600 mb-4">
                  This dashboard displays real-time statistics about your Swar Yoga platform including user registrations, logins, messages, and payment data.
                </p>
                <ul className="text-gray-600 space-y-2 ml-4">
                  <li>� <strong>Total Users:</strong> Total number of registered users</li>
                  <li>🔑 <strong>Total Logins:</strong> Total number of user login sessions</li>
                  <li>💬 <strong>Messages:</strong> Total contact messages received</li>
                  <li>🛒 <strong>Orders:</strong> Total number of orders placed</li>
                  <li>💰 <strong>Revenue:</strong> Total amount received in multiple currencies (INR, USD, NPR)</li>
                </ul>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
