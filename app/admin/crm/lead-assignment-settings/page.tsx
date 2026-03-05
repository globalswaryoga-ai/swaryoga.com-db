'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Users, 
  RefreshCw, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserPlus,
  BarChart3
} from 'lucide-react';

interface AdminUser {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface AssignmentSettings {
  _id?: string;
  settingKey: string;
  enabled: boolean;
  batchSize: number;
  adminUsers: AdminUser[];
  currentAdminIndex: number;
  currentBatchCount: number;
  totalAssigned: number;
  lastAssignedAt?: string;
}

interface AllAdmin {
  _id: string;
  name: string;
  email: string;
  userId: string;
}

interface UserInfo {
  isAdmin?: boolean;
  userId?: string;
}

export default function LeadAssignmentSettingsPage() {
  const router = useRouter();
  const token = useAuth();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [settings, setSettings] = useState<AssignmentSettings | null>(null);
  const [allAdmins, setAllAdmins] = useState<AllAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [batchSize, setBatchSize] = useState(5);
  const [selectedAdmins, setSelectedAdmins] = useState<AdminUser[]>([]);

  // Load user info from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUser(u);
      } catch {
        setUser(null);
      }
    }
  }, []);

  // Fetch settings and admin users
  const fetchData = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch settings
      const settingsRes = await fetch('/api/admin/crm/lead-assignment', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!settingsRes.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.data) {
        setSettings(settingsData.data);
        setEnabled(settingsData.data.enabled);
        setBatchSize(settingsData.data.batchSize);
        setSelectedAdmins(settingsData.data.adminUsers || []);
      }

      // Fetch all admin users
      const adminsRes = await fetch('/api/admin/users?role=admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAllAdmins(adminsData.users || adminsData || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  // Save settings
  const handleSave = async () => {
    if (!token) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/crm/lead-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled,
          batchSize,
          adminUsers: selectedAdmins
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSettings(data.data);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset counters
  const handleResetCounters = async () => {
    if (!token || !confirm('Are you sure you want to reset the assignment counters? This will start fresh from the first admin.')) return;
    
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/crm/lead-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resetCounters: true })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset counters');
      }

      setSettings(data.data);
      setSuccess('Counters reset successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset counters');
    } finally {
      setSaving(false);
    }
  };

  // Add admin to selection
  const addAdmin = (admin: AllAdmin) => {
    if (selectedAdmins.find(a => a.userId === admin.userId || a.userId === admin._id)) {
      return; // Already added
    }
    
    setSelectedAdmins([...selectedAdmins, {
      userId: admin.userId || admin._id,
      name: admin.name,
      email: admin.email,
      isActive: true
    }]);
  };

  // Remove admin from selection
  const removeAdmin = (userId: string) => {
    setSelectedAdmins(selectedAdmins.filter(a => a.userId !== userId));
  };

  // Toggle admin active status
  const toggleAdminActive = (userId: string) => {
    setSelectedAdmins(selectedAdmins.map(a => 
      a.userId === userId ? { ...a, isActive: !a.isActive } : a
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Access Denied</h2>
          <p className="text-gray-600">You need admin access to view this page.</p>
        </div>
      </div>
    );
  }

  return (
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-800">Lead Assignment Settings</h1>
            </div>
            <p className="text-gray-600">
              Configure automatic round-robin assignment of new WhatsApp leads to admin users.
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* Current Stats */}
          {settings && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Current Statistics</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`text-lg font-semibold ${settings.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                    {settings.enabled ? 'Active' : 'Disabled'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Assigned</p>
                  <p className="text-lg font-semibold text-gray-800">{settings.totalAssigned}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Current Admin</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {settings.adminUsers[settings.currentAdminIndex]?.name || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Batch Progress</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {settings.currentBatchCount} / {settings.batchSize}
                  </p>
                </div>
              </div>
              {settings.lastAssignedAt && (
                <p className="mt-4 text-sm text-gray-500">
                  Last assignment: {new Date(settings.lastAssignedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Settings Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Configuration</h2>
            
            {/* Enable/Disable Toggle */}
            <div className="mb-6 flex items-center justify-between pb-6 border-b">
              <div>
                <h3 className="font-medium text-gray-800">Enable Auto-Assignment</h3>
                <p className="text-sm text-gray-500">When enabled, new WhatsApp leads will be automatically assigned to admin users.</p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className="focus:outline-none"
              >
                {enabled ? (
                  <ToggleRight className="w-12 h-12 text-green-600" />
                ) : (
                  <ToggleLeft className="w-12 h-12 text-gray-400" />
                )}
              </button>
            </div>

            {/* Batch Size */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-medium text-gray-800 mb-2">Batch Size</h3>
              <p className="text-sm text-gray-500 mb-3">
                Number of leads to assign to each admin before rotating to the next one.
              </p>
              <div className="flex gap-3">
                {[5, 10, 15, 20, 25].map(size => (
                  <button
                    key={size}
                    onClick={() => setBatchSize(size)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      batchSize === size
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Users Selection */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Admin Users for Assignment
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Select which admin users will receive new leads. Leads will be assigned in the order shown below.
              </p>

              {/* Selected Admins */}
              {selectedAdmins.length > 0 && (
                <div className="mb-4 space-y-2">
                  {selectedAdmins.map((admin, index) => (
                    <div 
                      key={admin.userId}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        admin.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800">{admin.name}</p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAdminActive(admin.userId)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            admin.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {admin.isActive ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => removeAdmin(admin.userId)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Admins to Add */}
              {allAdmins.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Admin Users
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {allAdmins
                      .filter(admin => !selectedAdmins.find(a => a.userId === admin.userId || a.userId === admin._id))
                      .map(admin => (
                        <button
                          key={admin._id}
                          onClick={() => addAdmin(admin)}
                          className="px-3 py-2 bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-700 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          <span>{admin.name}</span>
                          <UserPlus className="w-4 h-4" />
                        </button>
                      ))}
                  </div>
                  {allAdmins.filter(admin => !selectedAdmins.find(a => a.userId === admin.userId || a.userId === admin._id)).length === 0 && (
                    <p className="text-sm text-gray-500">All admin users have been added.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Settings
            </button>
            
            <button
              onClick={handleResetCounters}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              Reset Counters
            </button>
            
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* How It Works */}
          <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-3">How Round-Robin Assignment Works</h3>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                When a new lead messages via WhatsApp for the first time, they are automatically assigned.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                The first {batchSize} leads go to Admin #1, the next {batchSize} to Admin #2, and so on.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                After all selected admins receive their batch, it cycles back to Admin #1.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                Paused admins are skipped during assignment but remain in the list.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">5.</span>
                The assigned admin appears in the lead's "assignedTo" field in the CRM.
              </li>
            </ul>
          </div>
        </div>
      </main>
  );
}
