'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, LogOut, Menu, X, Download } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface SignupUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  gender: string;
  age: number;
  profession: string;
  createdAt: string;
}

export default function SignupData() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminUser, setAdminUser] = useState('');
  const [signupData, setSignupData] = useState<SignupUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUsername = localStorage.getItem('adminUser');

    if (!adminToken) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      setAdminUser(adminUsername || '');
      fetchSignupData();
    }
  }, [router]);

  const fetchSignupData = async () => {
    try {
      setIsLoading(true);
      // Placeholder - will fetch from API when backend is ready
      const response = await fetch('/api/admin/signups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      }).catch(() => {
        // If API not available, show mock data
        return null;
      });

      if (response && response.ok) {
        const data = await response.json();
        setSignupData(data);
      } else {
        // Mock data for demo
        setSignupData([]);
      }
    } catch (err) {
      setError('Failed to fetch signup data');
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
      ['Name', 'Email', 'Phone', 'Country', 'State', 'Gender', 'Age', 'Profession', 'Date'].join(','),
      ...signupData.map(user =>
        [user.name, user.email, user.phone, user.country, user.state, user.gender, user.age, user.profession, new Date(user.createdAt).toLocaleDateString()].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signup_data.csv';
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
                <Users className="h-8 w-8 text-green-600" />
                <span>Signup Data</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center space-x-2"
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          ) : signupData.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No signup data available yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Country</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">State</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Gender</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Age</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Profession</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signupData.map((user, index) => (
                      <tr key={user._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm text-gray-800">{user.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.country}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.state}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.gender}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.age}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.profession}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stats Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <p className="text-sm text-gray-600">
                  Total signups: <span className="font-semibold text-gray-800">{signupData.length}</span>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
