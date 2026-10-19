'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import {
  Plus,
  Home,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
  Share2,
  Shield,
  Key,
  Layers,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface PlatformConfig {
  icon: string;
  name: string;
  color: string;
  badge: string;
  fields: string[];
  idPlaceholder: string;
  idValidation: (id: string) => boolean;
  idError: string;
  instructions: string[];
  helpLink: string;
  useOAuth?: boolean;
}

interface ConnectedAccount {
  _id: string;
  platform: string;
  accountName: string;
  accountHandle: string;
  accountId?: string;
  isConnected: boolean;
  connectedAt: string;
  metadata?: {
    autoConnectedVia?: string;
    linkedPageName?: string;
  };
}

interface SettingsScopeInfo {
  type: 'super_admin' | 'tenant';
  key: string;
  label: string;
}

const platforms: Record<string, PlatformConfig> = {
  facebook: {
    icon: '👍',
    name: 'Facebook Page',
    color: 'from-blue-600 to-indigo-700',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    fields: ['accountName', 'accountHandle', 'accountId', 'accessToken'],
    idPlaceholder: '61559147565482',
    idValidation: (id: string) => /^\d{10,20}$/.test(id),
    idError: '⚠️ Page ID must be a 10-20 digit NUMBER (e.g., 61559147565482). NOT a URL or @handle!',
    instructions: [
      '📍 STEP 1: Find Your Facebook Page ID',
      '   → Go to your Facebook Page → About → Page transparency → Copy Page ID',
      '📍 STEP 2: Get a Page Access Token',
      '   → Visit developers.facebook.com/tools/explorer',
      '   → Select your Meta App → "Get Page Access Token" → Grant pages_manage_posts & pages_read_engagement',
      '📍 STEP 3: Extend Token (Long-Lived 60 Days)',
      '   → In Token Debugger (developers.facebook.com/tools/debug/accesstoken), click "Extend Access Token"',
      '📍 STEP 4: Messenger Webhooks (Optional for CRM Live Chat)',
    ],
    helpLink: 'https://developers.facebook.com/tools/explorer/',
  },
  instagram: {
    icon: '📸',
    name: 'Instagram Business',
    color: 'from-pink-500 via-rose-500 to-purple-600',
    badge: 'bg-pink-100 text-pink-700 border-pink-200',
    fields: ['accountName', 'accountHandle', 'accountId', 'accountEmail', 'accessToken'],
    idPlaceholder: '17841401234567890',
    idValidation: (id: string) => /^\d{15,25}$/.test(id),
    idError: '⚠️ Instagram ID must be a 15-25 digit NUMBER (starts with 178414...). NOT @username!',
    instructions: [
      '⚠️ PREREQUISITE: Instagram must be a Professional/Business account connected to your Facebook Page',
      '📍 STEP 1: Find Instagram Business Account ID',
      '   → In Meta Graph Explorer, run query: me/accounts?fields=instagram_business_account',
      '   → Copy the id from the instagram_business_account object',
      '📍 STEP 2: Generate Access Token',
      '   → Add permissions: instagram_basic, instagram_content_publish, pages_read_engagement',
      '⚠️ NOTE: Instagram API requires image or video media for every post.',
    ],
    helpLink: 'https://developers.facebook.com/docs/instagram-api/getting-started',
  },
  youtube: {
    icon: '▶️',
    name: 'YouTube Channel',
    color: 'from-red-600 to-rose-700',
    badge: 'bg-red-100 text-red-700 border-red-200',
    fields: [],
    idPlaceholder: '',
    idValidation: () => true,
    idError: '',
    useOAuth: true,
    instructions: [
      '🔐 YouTube uses OAuth 2.0 for secure automated uploads.',
      '📍 ONE-TIME SERVER CONFIG:',
      '   Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in server environment with redirect URI:',
      '   https://swaryoga.com/api/admin/social-media/youtube/oauth/callback',
      '📍 CONNECT:',
      '   Click "Connect with Google" below to authenticate your YouTube channel.',
    ],
    helpLink: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
  },
  x: {
    icon: '𝕏',
    name: 'X (Twitter)',
    color: 'from-slate-800 to-slate-900',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    fields: ['accountName', 'accountHandle', 'accessToken'],
    idPlaceholder: '',
    idValidation: () => true,
    idError: '',
    instructions: [
      '📍 STEP 1: X Developer Portal',
      '   → Go to developer.twitter.com and create a project/app',
      '📍 STEP 2: Bearer Token',
      '   → Generate Bearer Token (must start with AAAA...)',
      '📌 Note: Free tier is read-only; Basic tier ($100/mo) is required by X for publishing posts.',
    ],
    helpLink: 'https://developer.twitter.com/en/portal/dashboard',
  },
  linkedin: {
    icon: '💼',
    name: 'LinkedIn Company Page',
    color: 'from-blue-700 to-cyan-800',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    fields: ['accountName', 'accountHandle', 'accountId', 'accessToken'],
    idPlaceholder: '12345678',
    idValidation: (id: string) => /^\d{5,15}$/.test(id),
    idError: '⚠️ Organization ID must be a 5-15 digit number from your Company Page URL',
    useOAuth: true,
    instructions: [
      '📍 Click "Connect with LinkedIn" below',
      '   → Authorize the requested company permissions',
      '   → Access tokens are refreshed and saved automatically (60-day cycle).',
    ],
    helpLink: 'https://www.linkedin.com/developers/apps',
  },
};

function SocialMediaSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string>('');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('facebook');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [settingsScope, setSettingsScope] = useState<SettingsScopeInfo | null>(null);
  const [formData, setFormData] = useState({
    accountName: '',
    accountHandle: '',
    accountId: '',
    accountEmail: '',
    accessToken: '',
    refreshToken: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    const storedToken =
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      '';
    if (storedToken) setToken(storedToken);
    setTokenChecked(true);
  }, []);

  const fetchConnectedAccounts = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/social-media/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        setToken('');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setConnectedAccounts(
          Array.isArray(data?.data) ? data.data : Array.isArray(data?.accounts) ? data.accounts : []
        );
        setSettingsScope(data?.scope || null);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConnectedAccounts();
    }
  }, [token]);

  useEffect(() => {
    const platform = searchParams.get('platform');
    if (platform && Object.prototype.hasOwnProperty.call(platforms, platform)) {
      setSelectedPlatform(platform);
    }

    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const channel = searchParams.get('channel');
    const linkedinAccount = searchParams.get('linkedin_account');

    if (success === 'connected' && channel) {
      setSuccessMessage(`✅ YouTube channel "${decodeURIComponent(channel)}" connected successfully!`);
      fetchConnectedAccounts();
    } else if (success === 'linkedin_connected' && linkedinAccount) {
      setSuccessMessage(`✅ LinkedIn connected as "${decodeURIComponent(linkedinAccount)}"! Token expires in 60 days.`);
      setSelectedPlatform('linkedin');
      fetchConnectedAccounts();
    } else if (error) {
      setErrorMessage(`❌ Authorization failed: ${decodeURIComponent(error)}`);
    }
  }, [searchParams]);

  const handleYouTubeOAuth = async () => {
    setOauthLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/admin/social-media/youtube/oauth?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to get OAuth URL');
      }
      window.location.href = data.authUrl;
    } catch (error) {
      setErrorMessage(`❌ ${error instanceof Error ? error.message : 'Failed to start OAuth flow'}`);
      setOauthLoading(false);
    }
  };

  const handleLinkedInOAuth = () => {
    setOauthLoading(true);
    setErrorMessage('');
    window.location.href = '/api/admin/linkedin/auth';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError('');
    setErrorMessage('');
  };

  const validateForm = (): boolean => {
    const platform = platforms[selectedPlatform];
    const requiredFields = platform.fields;
    for (const field of requiredFields) {
      if (field === 'accountId' && selectedPlatform === 'x') continue;
      if (field === 'accountEmail') continue;
      if (!formData[field as keyof typeof formData]) {
        setValidationError(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())} is required`);
        return false;
      }
    }
    if (formData.accountId && platform.idValidation && !platform.idValidation(formData.accountId)) {
      setValidationError(platform.idError);
      return false;
    }
    if (selectedPlatform === 'x' && formData.accessToken && !formData.accessToken.startsWith('AAAA')) {
      setValidationError('⚠️ X Bearer Token must start with "AAAA".');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/social-media/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          accountName: formData.accountName,
          accountHandle: formData.accountHandle.replace(/^@/, ''),
          accountId: formData.accountId,
          accountEmail: formData.accountEmail,
          accessToken: formData.accessToken,
          refreshToken: formData.refreshToken,
        }),
      });

      if (response.ok) {
        setSuccessMessage(`✅ Successfully connected ${platforms[selectedPlatform].name}!`);
        setFormData({
          accountName: '',
          accountHandle: '',
          accountId: '',
          accountEmail: '',
          accessToken: '',
          refreshToken: '',
        });
        fetchConnectedAccounts();
      } else {
        const err = await response.json().catch(() => ({}));
        setErrorMessage(`❌ ${err.error || 'Failed to connect account'}`);
      }
    } catch (error) {
      console.error('Error connecting account:', error);
      setErrorMessage('❌ Failed to connect account. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    try {
      const response = await fetch(`/api/admin/social-media/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSuccessMessage('✅ Account disconnected successfully.');
        fetchConnectedAccounts();
      } else {
        setErrorMessage('❌ Failed to disconnect account.');
      }
    } catch {
      setErrorMessage('❌ Network error while disconnecting account.');
    }
  };

  if (!tokenChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-fuchsia-100 text-fuchsia-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Key className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Login Required</h1>
          <p className="text-slate-600 text-sm mb-6">Please sign in to connect social media accounts.</p>
          <a
            href="/admin/login"
            className="inline-flex items-center justify-center w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold py-3 px-4 rounded-xl transition shadow-xs"
          >
            Go to Admin Login
          </a>
        </div>
      </div>
    );
  }

  const currentPlatform = platforms[selectedPlatform];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Vibrant Gradient Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-indigo-600" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/admin/crm/social-hub"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Social Hub
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-fuchsia-600">Channel Integration</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Social Media Setup
              </h1>
              <span className="bg-fuchsia-100 text-fuchsia-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-fuchsia-200">
                API Gateways
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Connect platform APIs, manage access tokens, and configure publishing credentials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/social-media"
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
            >
              <Share2 className="w-4 h-4" /> Go to Post Manager
            </Link>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Connected Channels</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{connectedAccounts.length}</h3>
              <p className="text-xs text-fuchsia-600 font-semibold mt-0.5">Active Integrations</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
              <Share2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supported Platforms</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{Object.keys(platforms).length}</h3>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">Ready for Connection</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settings Scope</p>
              <h3 className="text-base font-black text-slate-900 mt-1 truncate max-w-[140px]">
                {settingsScope?.label || 'Global SwarYoga'}
              </h3>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Active Environment</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">OAuth Protocols</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">2.0</h3>
              <p className="text-xs text-rose-600 font-semibold mt-0.5">Google & LinkedIn</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Platform Selector Strip */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(platforms).map(([pKey, pConf]) => {
              const isSelected = selectedPlatform === pKey;
              const isConn = connectedAccounts.some((a) => a.platform === pKey);
              return (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(pKey);
                    setValidationError('');
                    setErrorMessage('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-fuchsia-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="text-base">{pConf.icon}</span>
                  <span>{pConf.name}</span>
                  {isConn && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      ● Connected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform Configuration Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instructions Column */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentPlatform.icon}</span>
                <h3 className="font-bold text-slate-900">{currentPlatform.name}</h3>
              </div>
              <a
                href={currentPlatform.helpLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-fuchsia-600 hover:text-fuchsia-800 font-semibold flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs text-slate-700 font-sans">
              {currentPlatform.instructions.map((line, idx) => (
                <p key={idx} className={line.startsWith('📍') || line.startsWith('⚠️') ? 'font-bold text-slate-900 mt-2' : ''}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Connect {currentPlatform.name} Credentials
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Enter your access credentials or initiate OAuth to authorize SwarYoga posting.
            </p>

            {currentPlatform.useOAuth && currentPlatform.fields.length === 0 ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <span className="text-3xl">{currentPlatform.icon}</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">One-Click Google Authentication</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Grant YouTube upload and channel management permissions securely via Google OAuth.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleYouTubeOAuth}
                  disabled={oauthLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${oauthLoading ? 'animate-spin' : ''}`} />
                  {oauthLoading ? 'Connecting to Google...' : 'Connect with Google'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {validationError && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                    {validationError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Account Name</label>
                    <input
                      type="text"
                      name="accountName"
                      value={formData.accountName}
                      onChange={handleInputChange}
                      placeholder="e.g., SwarYoga Official"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Handle / Username</label>
                    <input
                      type="text"
                      name="accountHandle"
                      value={formData.accountHandle}
                      onChange={handleInputChange}
                      placeholder="e.g., swaryoga"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500"
                    />
                  </div>
                </div>

                {currentPlatform.fields.includes('accountId') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {selectedPlatform === 'facebook'
                        ? 'Facebook Page ID'
                        : selectedPlatform === 'instagram'
                        ? 'Instagram Business ID'
                        : 'Account / Org ID'}
                    </label>
                    <input
                      type="text"
                      name="accountId"
                      value={formData.accountId}
                      onChange={handleInputChange}
                      placeholder={currentPlatform.idPlaceholder}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 font-mono"
                    />
                  </div>
                )}

                {currentPlatform.fields.includes('accountEmail') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Account Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="accountEmail"
                      value={formData.accountEmail}
                      onChange={handleInputChange}
                      placeholder="contact@swaryoga.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500"
                    />
                  </div>
                )}

                {currentPlatform.fields.includes('accessToken') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Access Token / Bearer</label>
                    <textarea
                      name="accessToken"
                      rows={3}
                      value={formData.accessToken}
                      onChange={handleInputChange}
                      placeholder="Paste your API access token here..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  {currentPlatform.useOAuth && (
                    <button
                      type="button"
                      onClick={handleLinkedInOAuth}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Or Connect via OAuth →
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {loading ? 'Connecting...' : `Connect ${currentPlatform.name}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Connected Accounts List */}
        {connectedAccounts.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Active Connected Channels ({connectedAccounts.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {connectedAccounts.map((account) => (
                <div key={account._id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platforms[account.platform]?.icon ?? '📱'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm capitalize">{account.platform}</h4>
                        <span className="text-xs text-slate-500">@{account.accountHandle}</span>
                        {account.metadata?.linkedPageName && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {account.metadata.linkedPageName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Connected: {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(account._id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Disconnect account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SocialMediaSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SocialMediaSetupContent />
    </Suspense>
  );
}
