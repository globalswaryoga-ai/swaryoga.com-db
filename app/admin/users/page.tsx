'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'react-toastify';

interface AdminUser {
  _id: string;
  userId: string;
  email: string;
  isAdmin: boolean;
  permissions: string[];
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permissionMode, setPermissionMode] = useState<'all' | 'selected'>('all');
  const [selectedPermissions, setSelectedPermissions] = useState({
    crm: false,
    whatsapp: false,
    email: false,
  });

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchAdminUsers();
  }, [router]);

  const fetchAdminUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch admin users');
      const data = await response.json();
      setAdminUsers(data.data || []);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast.error('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (key: keyof typeof selectedPermissions) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (!userId || !email || !password) {
        toast.error('All fields are required');
        setFormLoading(false);
        return;
      }

      const permissions = permissionMode === 'all' 
        ? ['all'] 
        : Object.keys(selectedPermissions)
            .filter(key => selectedPermissions[key as keyof typeof selectedPermissions])
            .map(key => {
              if (key === 'crm') return 'crm';
              if (key === 'whatsapp') return 'whatsapp';
              if (key === 'email') return 'email';
              return '';
            })
            .filter(Boolean);

      if (permissionMode === 'selected' && permissions.length === 0) {
        toast.error('Select at least one permission');
        setFormLoading(false);
        return;
      }

      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          email,
          password,
          permissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin user');
      }

      toast.success('Admin user created successfully');
      setUserId('');
      setEmail('');
      setPassword('');
      setPermissionMode('all');
      setSelectedPermissions({ crm: false, whatsapp: false, email: false });
      setShowForm(false);
      fetchAdminUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error creating admin user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this admin user?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/auth/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete admin user');
      toast.success('Admin user deleted successfully');
      fetchAdminUsers();
    } catch (error) {
      toast.error('Failed to delete admin user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-blue-400 hover:text-blue-300">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold">Manage Admin Users</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            <Plus size={20} />
            Add Admin User
          </button>
        </div>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="bg-gray-800 border-b border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Admin User</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  placeholder="e.g., admincrm"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={formLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={formLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter strong password"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                disabled={formLoading}
              />
            </div>

            {/* Permissions Section */}
            <div className="border-t border-gray-600 pt-4">
              <label className="block text-sm font-medium mb-3">Permissions</label>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="all"
                    name="permission-mode"
                    checked={permissionMode === 'all'}
                    onChange={() => setPermissionMode('all')}
                    className="w-4 h-4 cursor-pointer"
                    disabled={formLoading}
                  />
                  <label htmlFor="all" className="cursor-pointer">
                    <span className="font-semibold">Full Access (All)</span>
                    <p className="text-sm text-gray-400">Can access Dashboard, CRM, WhatsApp, and Email</p>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="selected"
                    name="permission-mode"
                    checked={permissionMode === 'selected'}
                    onChange={() => setPermissionMode('selected')}
                    className="w-4 h-4 cursor-pointer"
                    disabled={formLoading}
                  />
                  <label htmlFor="selected" className="cursor-pointer">
                    <span className="font-semibold">Custom Permissions</span>
                    <p className="text-sm text-gray-400">Select specific modules to grant access</p>
                  </label>
                </div>
              </div>

              {/* Custom Permissions Checkboxes */}
              {permissionMode === 'selected' && (
                <div className="ml-7 mt-4 space-y-3 bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="crm"
                      checked={selectedPermissions.crm}
                      onChange={() => handlePermissionChange('crm')}
                      className="w-4 h-4 cursor-pointer"
                      disabled={formLoading}
                    />
                    <label htmlFor="crm" className="cursor-pointer flex items-center gap-2">
                      <Users size={16} />
                      <span>CRM - Manage leads, contacts, and customer relationships</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="whatsapp"
                      checked={selectedPermissions.whatsapp}
                      onChange={() => handlePermissionChange('whatsapp')}
                      className="w-4 h-4 cursor-pointer"
                      disabled={formLoading}
                    />
                    <label htmlFor="whatsapp" className="cursor-pointer">
                      <span>WhatsApp - Send and manage WhatsApp messages</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="email"
                      checked={selectedPermissions.email}
                      onChange={() => handlePermissionChange('email')}
                      className="w-4 h-4 cursor-pointer"
                      disabled={formLoading}
                    />
                    <label htmlFor="email" className="cursor-pointer">
                      <span>Email - Send and manage email campaigns</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition"
              >
                {formLoading ? 'Creating...' : 'Create Admin User'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={formLoading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Users Table */}
      <div className="p-6">
        {adminUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No admin users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Username</th>
                  <th className="text-left px-6 py-3 font-semibold">Email</th>
                  <th className="text-left px-6 py-3 font-semibold">Permissions</th>
                  <th className="text-left px-6 py-3 font-semibold">Created</th>
                  <th className="text-center px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map(user => (
                  <tr key={user._id} className="border-b border-gray-700 hover:bg-gray-800 transition">
                    <td className="px-6 py-3 font-semibold text-blue-400">{user.userId}</td>
                    <td className="px-6 py-3 text-gray-300">{user.email}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {user.permissions && user.permissions.length > 0 ? (
                          user.permissions.map(perm => (
                            <span
                              key={perm}
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                perm === 'all'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-blue-700 text-blue-100'
                              }`}
                            >
                              {perm.charAt(0).toUpperCase() + perm.slice(1)}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">No permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
