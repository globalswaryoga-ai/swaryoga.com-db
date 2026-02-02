'use client';

import { useState, useEffect, Suspense } from 'react';
import { Plus, Home, ArrowLeft, AlertTriangle, CheckCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

interface PlatformConfig {
  icon: string;
  name: string;
  color: string;
  fields: string[];
  idPlaceholder: string;
  idValidation: (id: string) => boolean;
  idError: string;
  instructions: string[];
  helpLink: string;
}

interface ConnectedAccount {
  _id: string;
  platform: string;
  accountName: string;
  accountHandle: string;
  accountId?: string;
  isConnected: boolean;
  connectedAt: string;
}

const platforms: Record<string, PlatformConfig> = {
  facebook: {
    icon: '👍',
    name: 'Facebook Page',
    color: 'from-blue-600 to-blue-700',
    fields: ['accountName', 'accountHandle', 'accountId', 'accessToken'],
    idPlaceholder: '61559147565482',
    idValidation: (id: string) => /^\d{10,20}$/.test(id),
    idError: '⚠️ Page ID must be a 10-20 digit NUMBER (e.g., 61559147565482). NOT a URL or @handle!',
    instructions: [
      '📍 STEP 1: Find Your Facebook Page ID',
      '   → Go to your Facebook Page',
      '   → Click "About" in the left menu',
      '   → Scroll down to "Page transparency"',
      '   → Find "Page ID" - it\'s a long number like 61559147565482',
      '',
      '📍 STEP 2: Get a Page Access Token',
      '   → Go to: developers.facebook.com/tools/explorer',
      '   → Select your App from the dropdown',
      '   → Click "Get Page Access Token"',
      '   → Select your Page from the list',
      '   → Click "Generate Access Token"',
      '   → IMPORTANT: Add these permissions:',
      '     • pages_manage_posts',
      '     • pages_read_engagement',
      '',
      '📍 STEP 3: Extend Token (IMPORTANT!)',
      '   → Default tokens expire in 1 hour!',
      '   → Go to: developers.facebook.com/tools/debug/accesstoken',
      '   → Paste your token and click "Debug"',
      '   → Click "Extend Access Token" at the bottom',
      '   → Copy the NEW long-lived token (lasts 60 days)'
    ],
    helpLink: 'https://developers.facebook.com/tools/explorer/'
  },
  instagram: {
    icon: '📸',
    name: 'Instagram Business',
    color: 'from-pink-500 to-purple-600',
    fields: ['accountName', 'accountHandle', 'accountId', 'accountEmail', 'accessToken'],
    idPlaceholder: '17841401234567890',
    idValidation: (id: string) => /^\d{15,25}$/.test(id),
    idError: '⚠️ Instagram ID must be a 15-25 digit NUMBER (starts with 178414...). NOT @username!',
    instructions: [
      '⚠️ PREREQUISITE: Your Instagram must be a Business/Creator account',
      '   AND it must be linked to a Facebook Page!',
      '',
      '📍 STEP 1: Find Your Instagram Business Account ID',
      '   → Go to: developers.facebook.com/tools/explorer',
      '   → Select your App',
      '   → In the query field, type:',
      '     me/accounts?fields=instagram_business_account',
      '   → Click "Submit"',
      '   → Find your Page in the results',
      '   → Copy the id from "instagram_business_account"',
      '   → It looks like: 17841401234567890',
      '',
      '📍 STEP 2: Get Access Token',
      '   → Same as Facebook - use Graph API Explorer',
      '   → Required permissions:',
      '     • instagram_basic',
      '     • instagram_content_publish',
      '     • pages_read_engagement',
      '',
      '⚠️ NOTE: Instagram API does NOT support text-only posts!',
      '   You MUST include at least one image.'
    ],
    helpLink: 'https://developers.facebook.com/docs/instagram-api/getting-started'
  },
  youtube: {
    icon: '▶️',
    name: 'YouTube Channel',
    color: 'from-red-600 to-red-700',
    fields: ['accountName', 'accountHandle', 'accountId', 'accessToken'],
    idPlaceholder: 'UCxxxxxxxxxxxxxxxxxxxxxxxx',
    idValidation: (id: string) => id.startsWith('UC') && id.length === 24,
    idError: '⚠️ Channel ID must start with "UC" and be exactly 24 characters (e.g., UCxxxxxx...)',
    instructions: [
      '📍 STEP 1: Find Your YouTube Channel ID',
      '   → Go to: studio.youtube.com',
      '   → Click your profile icon (top right)',
      '   → Click "Settings"',
      '   → Go to "Channel" → "Advanced settings"',
      '   → Copy your "Channel ID"',
      '   → It starts with UC and is 24 characters',
      '',
      '📍 STEP 2: Get API Key',
      '   → Go to: console.cloud.google.com',
      '   → Create a new project (or select existing)',
      '   → Go to "APIs & Services" → "Library"',
      '   → Search for "YouTube Data API v3"',
      '   → Click "Enable"',
      '   → Go to "Credentials" → "Create Credentials" → "API Key"',
      '   → Copy the API key (starts with AIza...)',
      '',
      '📌 Current support: Read channel stats',
      '   Video uploads require OAuth (coming soon)'
    ],
    helpLink: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com'
  },
  x: {
    icon: '𝕏',
    name: 'X (Twitter)',
    color: 'from-black to-gray-800',
    fields: ['accountName', 'accountHandle', 'accessToken'],
    idPlaceholder: '',
    idValidation: () => true,
    idError: '',
    instructions: [
      '📍 STEP 1: Create X Developer Account',
      '   → Go to: developer.twitter.com',
      '   → Sign up for Free or Basic tier ($100/month for posting)',
      '   → Create a new Project and App',
      '',
      '📍 STEP 2: Get Bearer Token',
      '   → In your App settings, go to "Keys and Tokens"',
      '   → Find "Bearer Token" section',
      '   → Click "Generate" or "Regenerate"',
      '   → Copy the token',
      '',
      '⚠️ IMPORTANT: Bearer token MUST start with "AAAA..."',
      '   If it doesn\'t, you have the wrong token!',
      '',
      '📌 Character limit: 280 characters per post',
      '📌 Free tier: Read-only. Basic tier ($100/mo): Post enabled'
    ],
    helpLink: 'https://developer.twitter.com/en/portal/dashboard'
  },
  linkedin: {
    icon: '💼',
    name: 'LinkedIn Company Page',
    color: 'from-blue-700 to-blue-800',
    fields: ['accountName', 'accountHandle', 'accountId', 'accessToken'],
    idPlaceholder: '12345678',
    idValidation: (id: string) => /^\d{5,15}$/.test(id),
    idError: '⚠️ Organization ID must be a 5-15 digit number from your Company Page URL',
    instructions: [
      '📍 STEP 1: Find Your Company Page ID',
      '   → Go to your LinkedIn Company Page',
      '   → Look at the URL:',
      '     linkedin.com/company/12345678/',
      '   → Copy the number from the URL',
      '',
      '📍 STEP 2: Create LinkedIn Developer App',
      '   → Go to: linkedin.com/developers/apps',
      '   → Click "Create App"',
      '   → Fill in app details',
      '   → Add your Company Page',
      '   → Request Marketing API access',
      '',
      '📍 STEP 3: Get Access Token',
      '   → You need OAuth to get a token',
      '   → Required scopes: w_organization_social, rw_organization_admin',
      '',
      '⚠️ LinkedIn tokens expire in 60 days',
      '📌 You must be a Page admin to post'
    ],
    helpLink: 'https://www.linkedin.com/developers/apps'
  }
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

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) setToken(storedToken);
    setTokenChecked(true);
  }, []);

  useEffect(() => {
    if (token) {
      fetchConnectedAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const platform = searchParams.get('platform');
    if (platform && Object.prototype.hasOwnProperty.call(platforms, platform)) {
      setSelectedPlatform(platform);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch('/api/admin/social-media/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConnectedAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError('');
    setErrorMessage('');
  };

  const validateForm = (): boolean => {
    const platform = platforms[selectedPlatform];
    
    // Check required fields
    const requiredFields = platform.fields;
    for (const field of requiredFields) {
      if (field === 'accountId' && selectedPlatform === 'x') continue; // X doesn't need accountId
      if (field === 'accountEmail') continue; // Email is optional
      if (!formData[field as keyof typeof formData]) {
        setValidationError(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`);
        return false;
      }
    }

    // Validate account ID format
    if (formData.accountId && platform.idValidation && !platform.idValidation(formData.accountId)) {
      setValidationError(platform.idError);
      return false;
    }

    // Platform-specific validations
    if (selectedPlatform === 'x' && formData.accessToken && !formData.accessToken.startsWith('AAAA')) {
      setValidationError('⚠️ X Bearer Token must start with "AAAA". You may have copied the wrong token.');
      return false;
    }

    if (selectedPlatform === 'youtube' && formData.accessToken && !formData.accessToken.startsWith('AIza')) {
      setValidationError('⚠️ YouTube API Key should start with "AIza". Make sure you\'re using an API Key, not OAuth token.');
      return false;
    }

    return true;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setTesting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/social-media/accounts/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          accountId: formData.accountId,
          accessToken: formData.accessToken,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSuccessMessage(`✅ Connection successful! ${result.message || ''}`);
      } else {
        setErrorMessage(`❌ Connection failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setErrorMessage('❌ Connection test failed. Please check your credentials.');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage('');
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
          accountHandle: formData.accountHandle,
          accountId: formData.accountId || undefined,
          accountEmail: formData.accountEmail || undefined,
          accessToken: formData.accessToken,
          refreshToken: formData.refreshToken || undefined,
        }),
      });

      if (response.ok) {
        setSuccessMessage(`✅ ${platforms[selectedPlatform].name} connected successfully!`);
        setFormData({
          accountName: '',
          accountHandle: '',
          accountId: '',
          accountEmail: '',
          accessToken: '',
          refreshToken: '',
        });
        fetchConnectedAccounts();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const error = await response.json();
        setErrorMessage(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('❌ Failed to connect account');
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
        setSuccessMessage('✅ Account disconnected');
        fetchConnectedAccounts();
      } else {
        setErrorMessage('❌ Failed to disconnect account');
      }
    } catch (error) {
      setErrorMessage('❌ Failed to disconnect account');
    }
  };

  const currentPlatform = platforms[selectedPlatform];

  if (!tokenChecked) {
    return (
      <div className="flex h-screen bg-slate-900">
        <AdminSidebar isOpen={true} onClose={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-screen bg-slate-900">
        <AdminSidebar isOpen={true} onClose={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-2xl font-bold text-white mb-2">Admin login required</h1>
            <p className="text-slate-400 mb-6">Please sign in to connect social media accounts.</p>
            <a
              href="/admin/login"
              className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-lg transition"
            >
              Go to Admin Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <AdminSidebar isOpen={true} onClose={() => {}} />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header with Navigation */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🔗 Connect Social Media</h1>
              <p className="text-slate-400">Add your social media accounts to post from one place</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/admin/social-media')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                📝 Create Posts
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                <Home size={20} />
                Home
              </button>
            </div>
          </div>

          {/* Connected Accounts Summary */}
          {connectedAccounts.length > 0 && (
            <div className="mb-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">📱 Connected Accounts ({connectedAccounts.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedAccounts.map((account) => {
                  const platformConfig = platforms[account.platform];
                  const hasValidId = platformConfig?.idValidation ? 
                    (account.accountId ? platformConfig.idValidation(account.accountId) : false) : true;
                  
                  return (
                    <div key={account._id} className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{platformConfig?.icon || '📱'}</span>
                        <div>
                          <p className="text-white font-medium">{account.accountName}</p>
                          <p className="text-slate-400 text-sm">{account.accountHandle}</p>
                          {!hasValidId && account.platform !== 'x' && (
                            <p className="text-amber-400 text-xs flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} /> Invalid ID format - please update
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(account._id)}
                        className="text-slate-400 hover:text-red-400 transition p-2"
                        title="Disconnect"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Platform Selection */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold text-white mb-4">Select Platform</h2>
              <div className="space-y-3">
                {Object.entries(platforms).map(([key, platform]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPlatform(key);
                      setValidationError('');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`w-full p-4 rounded-lg text-left transition flex items-center gap-3 ${
                      selectedPlatform === key
                        ? `bg-gradient-to-r ${platform.color} text-white font-bold`
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span>{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
                {/* Messages */}
                {successMessage && (
                  <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500 rounded-lg text-emerald-300 flex items-center gap-2">
                    <CheckCircle size={20} />
                    {successMessage}
                  </div>
                )}
                {errorMessage && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {errorMessage}
                  </div>
                )}
                {validationError && (
                  <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500 rounded-lg text-amber-300 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {validationError}
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {currentPlatform.icon} {currentPlatform.name} Setup
                  </h2>
                  <a
                    href={currentPlatform.helpLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <ExternalLink size={16} />
                    Open Developer Portal
                  </a>
                </div>

                {/* Instructions - Collapsible */}
                <details className="bg-slate-700 rounded-lg mb-8 border border-slate-600">
                  <summary className="p-4 cursor-pointer text-white font-bold hover:bg-slate-600 rounded-lg">
                    📖 Step-by-Step Instructions (Click to expand)
                  </summary>
                  <div className="p-6 pt-2 border-t border-slate-600">
                    <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {currentPlatform.instructions.join('\n')}
                    </pre>
                  </div>
                </details>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Account Name */}
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Account Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="accountName"
                      placeholder="e.g., Swar Yoga Official"
                      value={formData.accountName}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-slate-400 text-sm mt-1">A friendly name for this account</p>
                  </div>

                  {/* Account Handle */}
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Username/Handle <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="accountHandle"
                      placeholder="e.g., @swaryoga"
                      value={formData.accountHandle}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-slate-400 text-sm mt-1">Your public username on this platform</p>
                  </div>

                  {/* Account/Page ID */}
                  {selectedPlatform !== 'x' && (
                    <div>
                      <label className="block text-white font-semibold mb-2">
                        {selectedPlatform === 'facebook' && 'Facebook Page ID'}
                        {selectedPlatform === 'instagram' && 'Instagram Business Account ID'}
                        {selectedPlatform === 'youtube' && 'YouTube Channel ID'}
                        {selectedPlatform === 'linkedin' && 'LinkedIn Organization ID'}
                        <span className="text-red-400"> *</span>
                      </label>
                      <input
                        type="text"
                        name="accountId"
                        placeholder={currentPlatform.idPlaceholder}
                        value={formData.accountId}
                        onChange={handleInputChange}
                        className={`w-full bg-slate-700 text-white px-4 py-3 rounded-lg border focus:outline-none font-mono ${
                          formData.accountId && !currentPlatform.idValidation(formData.accountId)
                            ? 'border-amber-500 focus:border-amber-500'
                            : 'border-slate-600 focus:border-emerald-500'
                        }`}
                      />
                      <p className="text-amber-400 text-sm mt-1 font-medium">
                        ⚠️ This must be a NUMERIC ID, not a URL or @handle!
                      </p>
                      {formData.accountId && !currentPlatform.idValidation(formData.accountId) && (
                        <p className="text-red-400 text-sm mt-1">{currentPlatform.idError}</p>
                      )}
                    </div>
                  )}

                  {/* Account Email (Instagram only) */}
                  {selectedPlatform === 'instagram' && (
                    <div>
                      <label className="block text-white font-semibold mb-2">Account Email</label>
                      <input
                        type="email"
                        name="accountEmail"
                        placeholder="e.g., admin@swaryoga.com"
                        value={formData.accountEmail}
                        onChange={handleInputChange}
                        className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Access Token */}
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      {selectedPlatform === 'youtube' ? 'API Key' : 'Access Token'} <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      name="accessToken"
                      placeholder={
                        selectedPlatform === 'facebook' ? 'Paste your Page Access Token (very long string)...' :
                        selectedPlatform === 'instagram' ? 'Paste your Page Access Token...' :
                        selectedPlatform === 'youtube' ? 'Paste your API Key (starts with AIza...)' :
                        selectedPlatform === 'x' ? 'Paste your Bearer Token (starts with AAAA...)' :
                        'Paste your access token...'
                      }
                      value={formData.accessToken}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                    />
                    <p className="text-slate-400 text-sm mt-1">🔒 Encrypted before storage (AES-256)</p>
                  </div>

                  {/* Refresh Token (Optional) */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Refresh Token (Optional)</label>
                    <input
                      type="text"
                      name="refreshToken"
                      placeholder="If available, paste refresh token here"
                      value={formData.refreshToken}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 pt-6">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing || !formData.accessToken}
                      className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={20} className={testing ? 'animate-spin' : ''} />
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      {loading ? 'Connecting...' : 'Connect Account'}
                    </button>
                  </div>
                </form>

                {/* Security Note */}
                <div className="mt-8 pt-6 border-t border-slate-700">
                  <h4 className="text-white font-semibold mb-3">🔐 Security</h4>
                  <ul className="text-slate-300 text-sm space-y-2">
                    <li>✅ Tokens encrypted with AES-256-GCM</li>
                    <li>✅ Never stored in plain text</li>
                    <li>✅ Never exposed to frontend</li>
                    <li>✅ Only used server-side for posting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SocialMediaSetup() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-900"><p className="text-white">Loading...</p></div>}>
      <SocialMediaSetupContent />
    </Suspense>
  );
}
