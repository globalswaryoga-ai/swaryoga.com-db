'use client';

export const dynamic = 'force-dynamic';

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
  useOAuth?: boolean; // For platforms that use OAuth flow
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
      '     • pages_manage_metadata',
      '     • pages_messaging',
      '',
      '📍 STEP 3: Extend Token (IMPORTANT!)',
      '   → Default tokens expire in 1 hour!',
      '   → Go to: developers.facebook.com/tools/debug/accesstoken',
      '   → Paste your token and click "Debug"',
      '   → Click "Extend Access Token" at the bottom',
      '   → Copy the NEW long-lived token (lasts 60 days)',
      '',
      '📍 STEP 4: For Messenger Inbox',
      '   → Add the Messenger product in your Meta app',
      '   → Subscribe your Facebook Page to the app',
      '   → Configure Messenger webhooks for message events',
      '   → Without webhook subscription, this CRM can connect the Page but will not receive Messenger chats yet'
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
    fields: [], // Uses OAuth - no manual fields needed
    idPlaceholder: '',
    idValidation: () => true,
    idError: '',
    useOAuth: true, // Special flag for OAuth platforms
    instructions: [
      '🔐 YouTube uses OAuth 2.0 for secure video uploads.',
      '',
      '📍 ONE-TIME SETUP (Admin only):',
      '   1. Go to: console.cloud.google.com',
      '   2. Create a project or select existing',
      '   3. Enable "YouTube Data API v3"',
      '   4. Go to "APIs & Services" → "OAuth consent screen"',
      '   5. Configure consent screen (External, fill required fields)',
      '   6. Add scopes: youtube.upload, youtube.readonly',
      '   7. Go to "Credentials" → "Create Credentials" → "OAuth client ID"',
      '   8. Select "Web application"',
      '   9. Add authorized redirect URI:',
      '      YOUR_DOMAIN/api/admin/social-media/youtube/oauth/callback',
      '   10. Copy Client ID and Secret to .env:',
      '       GOOGLE_CLIENT_ID=your_client_id',
      '       GOOGLE_CLIENT_SECRET=your_client_secret',
      '',
      '📍 CONNECT YOUR CHANNEL:',
      '   → Click "Connect with Google" below',
      '   → Sign in and authorize access',
      '   → Your channel will be connected automatically',
      '',
      '✅ Video uploads, channel stats, and analytics supported!'
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
    useOAuth: true,
    instructions: [
      '📍 Click "Connect with LinkedIn" below',
      '   → You will be redirected to LinkedIn',
      '   → Approve the permissions',
      '   → Token is saved automatically',
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
    
    // Handle OAuth success/error from redirect
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
      const errorMessages: Record<string, string> = {
        'access_denied': 'Authorization was denied. Please try again.',
        'missing_code': 'No authorization code received from Google.',
        'missing_credentials': 'Server misconfiguration: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set.',
        'token_exchange_failed': 'Failed to exchange authorization code. Please try again.',
        'no_channel_found': 'No YouTube channel found for this Google account.',
        'internal_error': 'An unexpected error occurred. Please try again.',
        'linkedin_missing_code': 'No authorization code received from LinkedIn.',
        'linkedin_missing_credentials': 'LinkedIn credentials not configured on server.',
        'linkedin_token_failed': 'Failed to exchange LinkedIn authorization code. Please try again.',
        'linkedin_error': 'LinkedIn authorization error. Please try again.',
      };
      setErrorMessage(`❌ ${errorMessages[error] || decodeURIComponent(error)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [oauthLoading, setOauthLoading] = useState(false);

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
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      setErrorMessage(`❌ ${error instanceof Error ? error.message : 'Failed to start OAuth flow'}`);
      setOauthLoading(false);
    }
  };

  const handleLinkedInOAuth = () => {
    setOauthLoading(true);
    setErrorMessage('');
    // Redirect directly to our LinkedIn auth endpoint
    window.location.href = '/api/admin/linkedin/auth';
  };

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch('/api/admin/social-media/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConnectedAccounts(Array.isArray(data?.data) ? data.data : Array.isArray(data?.accounts) ? data.accounts : []);
        setSettingsScope(data?.scope || null);
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

    // YouTube uses OAuth - no manual validation needed

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
        const data = await response.json().catch(() => ({}));
        const autoConnected = Array.isArray(data?.data?.autoConnectedPlatforms) ? data.data.autoConnectedPlatforms : [];
        const autoLabel = autoConnected.length
          ? ` Auto-connected: ${autoConnected.map((item: string) => item.charAt(0).toUpperCase() + item.slice(1)).join(', ')}.`
          : '';
        setSuccessMessage(`✅ ${data?.message || `${platforms[selectedPlatform].name} connected successfully!`}${autoLabel}`);
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
              {settingsScope && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                  {settingsScope.label}
                </div>
              )}
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
              {settingsScope && (
                <p className="text-sm text-slate-400 mb-4">
                  These Meta/social connections belong to <span className="text-white font-semibold">{settingsScope.label}</span>.
                </p>
              )}
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
                          {account.metadata?.autoConnectedVia === 'facebook' && (
                            <p className="text-emerald-400 text-xs mt-1">
                              Auto-linked from Facebook Page{account.metadata?.linkedPageName ? `: ${account.metadata.linkedPageName}` : ''}
                            </p>
                          )}
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

                {(selectedPlatform === 'facebook' || selectedPlatform === 'instagram') && (
                  <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/40 rounded-lg text-blue-200 text-sm flex items-start gap-2">
                    <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <span>
                      Easier option: use the <strong>Connect Facebook Page</strong> button on the{' '}
                      <a href="/admin/crm/messenger" className="underline hover:text-white">Messenger</a> or{' '}
                      <a href="/admin/crm/instagram" className="underline hover:text-white">Instagram</a> inbox page instead.
                      That one-click login now requests messaging AND posting permissions together, so you don&apos;t need to manually
                      generate a token here. Use the manual form below only if you need a different/shared token.
                    </span>
                  </div>
                )}

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
                {currentPlatform.useOAuth ? (
                  /* OAuth-based platform (YouTube / LinkedIn) */
                  <div className="space-y-6">
                    <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                      <p className="text-slate-300 mb-4">
                        {selectedPlatform === 'linkedin'
                          ? 'Click the button below to connect your LinkedIn Company Page. You\'ll be redirected to LinkedIn to authorize access.'
                          : 'Click the button below to connect your YouTube channel. You\'ll be redirected to Google to authorize access.'}
                      </p>
                      {selectedPlatform === 'linkedin' ? (
                        <button
                          type="button"
                          onClick={handleLinkedInOAuth}
                          disabled={oauthLoading}
                          className="w-full bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg transition flex items-center justify-center gap-3"
                        >
                          {oauthLoading ? (
                            <>
                              <RefreshCw className="animate-spin" size={20} />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                              Connect with LinkedIn
                            </>
                          )}
                        </button>
                      ) : (
                      <button
                        type="button"
                        onClick={handleYouTubeOAuth}
                        disabled={oauthLoading}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg transition flex items-center justify-center gap-3"
                      >
                        {oauthLoading ? (
                          <>
                            <RefreshCw className="animate-spin" size={20} />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Connect with Google
                          </>
                        )}
                      </button>
                      )}
                    </div>
                    
                    <div className="text-slate-400 text-sm">
                      <p className="font-semibold text-white mb-2">Required scopes:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedPlatform === 'linkedin' ? (
                          <>
                            <li>openid, profile, email - Account info</li>
                            <li>w_member_social - Post on your behalf</li>
                          </>
                        ) : (
                          <>
                            <li>youtube.upload - Upload videos to your channel</li>
                            <li>youtube.readonly - Read channel info and stats</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
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
                )}

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
