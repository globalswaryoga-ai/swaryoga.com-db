'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, TestTube, CheckCircle, AlertCircle, ArrowLeft, Globe, Lock, Users, HardDrive, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface S3Settings {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicPrefix: string;
  adminPrefix: string;
  communityPrefix: string;
}

interface StorageStats {
  public: { count: number; size: string };
  admin: { count: number; size: string };
  community: { count: number; size: string };
  total: { count: number; size: string };
}

export default function S3SettingsPage() {
  const token = useAuth();
  const [settings, setSettings] = useState<S3Settings>({
    bucket: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    publicPrefix: 'public/',
    adminPrefix: 'admin/',
    communityPrefix: 'community/',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    if (token) {
      fetchSettings();
      fetchStats();
    }
  }, [token]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/media/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/media/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/media/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Settings saved successfully!' });
      } else {
        const data = await response.json();
        setTestResult({ success: false, message: data.error || 'Failed to save' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/admin/media/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      setTestResult({
        success: response.ok,
        message: data.message || (response.ok ? 'Connection successful!' : 'Connection failed'),
      });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'ap-south-1', 'ap-northeast-1', 'ap-southeast-1', 'ap-southeast-2',
    'eu-west-1', 'eu-west-2', 'eu-central-1',
  ];

  return (
    <div className="dark-theme min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/crm/media"
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">⚙️ S3 Settings</h1>
              <p className="text-slate-400">Configure AWS S3 storage for media files</p>
            </div>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            {testing ? <RefreshCw size={18} className="animate-spin" /> : <TestTube size={18} />}
            Test Connection
          </button>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            testResult.success
              ? 'bg-green-900/50 border border-green-700 text-green-300'
              : 'bg-red-900/50 border border-red-700 text-red-300'
          }`}>
            {testResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {testResult.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* AWS Credentials */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Settings size={20} className="text-orange-400" />
                AWS Credentials
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">S3 Bucket Name</label>
                  <input
                    type="text"
                    value={settings.bucket}
                    onChange={(e) => setSettings({ ...settings, bucket: e.target.value })}
                    placeholder="swarygoal1hindi"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">AWS Region</label>
                  <select
                    value={settings.region}
                    onChange={(e) => setSettings({ ...settings, region: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                  >
                    {regions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Access Key ID</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={settings.accessKeyId}
                    onChange={(e) => setSettings({ ...settings, accessKeyId: e.target.value })}
                    placeholder="AKIA..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Secret Access Key</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={settings.secretAccessKey}
                    onChange={(e) => setSettings({ ...settings, secretAccessKey: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <button
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  {showSecrets ? '🙈 Hide credentials' : '👁️ Show credentials'}
                </button>
              </div>
            </div>

            {/* Folder Structure */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HardDrive size={20} className="text-blue-400" />
                Folder Structure
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Globe size={16} className="text-green-400" />
                    Public Files Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.publicPrefix}
                    onChange={(e) => setSettings({ ...settings, publicPrefix: e.target.value })}
                    placeholder="public/"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">For global community & public website content</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Lock size={16} className="text-red-400" />
                    Admin Files Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.adminPrefix}
                    onChange={(e) => setSettings({ ...settings, adminPrefix: e.target.value })}
                    placeholder="admin/"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">For internal admin documents & reports</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Users size={16} className="text-purple-400" />
                    Community Files Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.communityPrefix}
                    onChange={(e) => setSettings({ ...settings, communityPrefix: e.target.value })}
                    placeholder="community/"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">For member-only community videos & files</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Storage Stats */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">📊 Storage Usage</h2>
              
              {stats ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 flex items-center gap-2">
                        <Globe size={16} /> Public
                      </span>
                      <span className="text-white font-bold">{stats.public.count} files</span>
                    </div>
                    <p className="text-green-300/70 text-sm mt-1">{stats.public.size}</p>
                  </div>

                  <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 flex items-center gap-2">
                        <Lock size={16} /> Admin
                      </span>
                      <span className="text-white font-bold">{stats.admin.count} files</span>
                    </div>
                    <p className="text-red-300/70 text-sm mt-1">{stats.admin.size}</p>
                  </div>

                  <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 flex items-center gap-2">
                        <Users size={16} /> Community
                      </span>
                      <span className="text-white font-bold">{stats.community.count} files</span>
                    </div>
                    <p className="text-purple-300/70 text-sm mt-1">{stats.community.size}</p>
                  </div>

                  <div className="p-4 bg-slate-700 rounded-lg border-2 border-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">Total</span>
                      <span className="text-white font-bold">{stats.total.count} files</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{stats.total.size}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                  Loading stats...
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">ℹ️ Access Rules</h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-green-900/20 rounded-lg border border-green-800/50">
                  <p className="text-green-400 font-medium">🌐 Global Community</p>
                  <p className="text-green-300/70">Public - Anyone can view</p>
                </div>
                <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-800/50">
                  <p className="text-purple-400 font-medium">👥 Other Communities</p>
                  <p className="text-purple-300/70">Private - Members only</p>
                </div>
                <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-800/50">
                  <p className="text-blue-400 font-medium">📄 Frontend Pages</p>
                  <p className="text-blue-300/70">Public - Website visitors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
