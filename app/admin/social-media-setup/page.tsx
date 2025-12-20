'use client';

import { useState, useEffect } from 'react';
import { Plus, Copy, Check, Home, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

const platforms = {
  facebook: {
    icon: '👍',
    name: 'Facebook',
    color: 'from-blue-600 to-blue-700',
    fields: ['accountName', 'accountHandle', 'accountId', 'accessToken'],
    instructions: [
      '1. Go to https://developers.facebook.com',
      '2. Create or select your app',
      '3. Go to Settings → Basic',
      '4. Copy the App ID and App Secret',
      '5. Go to Tools → Access Token Generator',
      '6. Select your Page and generate Page Access Token',
      '7. Copy your Page ID (numeric) and paste it below',
      '8. Paste the token below'
    ]
  },
  youtube: {
    icon: '▶️',
    name: 'YouTube',
    color: 'from-red-600 to-red-700',
    fields: ['accountName', 'accountHandle', 'accountId', 'accessToken'],
    instructions: [
      '1. Go to https://console.cloud.google.com',
      '2. Create/select a project',
      '3. Enable “YouTube Data API v3”',
      '4. (Recommended for follower sync) Go to Credentials → Create API key',
      '5. Copy your Channel ID (usually looks like UC...) and paste it as Account/Channel ID',
      '6. Paste API key as Access Token (starts with AIza...)',
      '7. (Optional) If you want video upload later, you will need OAuth instead of API key'
    ]
  },
  x: {
    icon: '𝕏',
    name: 'X (Twitter)',
    color: 'from-black to-gray-800',
    fields: ['accountName', 'accountHandle', 'accessToken'],
    instructions: [
      '1. Go to https://developer.twitter.com/en/portal/dashboard',
      '2. Create an app',
      '3. Go to Keys and Tokens',
      '4. Generate a Bearer Token',
      '5. Copy your API Key, API Secret, and Bearer Token',
      '6. Paste the Bearer Token below'
    ]
  },
  linkedin: {
    icon: '💼',
    name: 'LinkedIn',
    color: 'from-blue-700 to-blue-800',
    fields: ['accountName', 'accountHandle', 'accountId', 'accessToken'],
    instructions: [
      '1. Go to https://www.linkedin.com/developers',
      '2. Create an app',
      '3. Go to Auth → Authorized redirect URLs',
      '4. Add your redirect URL',
      '5. Go to Auth → Credentials',
      '6. Copy Client ID and Client Secret',
      '7. Generate and paste your access token'
    ]
  },
  instagram: {
    icon: '📸',
    name: 'Instagram',
    color: 'from-pink-500 to-purple-600',
    fields: ['accountName', 'accountHandle', 'accountId', 'accountEmail', 'accessToken'],
    instructions: [
      '1. Go to https://developers.facebook.com',
      '2. Create a Facebook App',
      '3. Add Instagram Graph API product',
      '4. Get your Instagram Business Account ID',
      '5. Go to Tools → Access Token Debugger',
      '6. Generate a long-lived access token',
      '7. Paste it below'
    ]
  }
};

export default function SocialMediaSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string>('');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('facebook');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountName: '',
    accountHandle: '',
    accountId: '',
    accountEmail: '',
    accessToken: '',
    refreshToken: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) setToken(storedToken);
    setTokenChecked(true);
  }, []);

  useEffect(() => {
    const platform = searchParams.get('platform');
    if (platform && Object.prototype.hasOwnProperty.call(platforms, platform)) {
      setSelectedPlatform(platform);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFields = platforms[selectedPlatform as keyof typeof platforms].fields;
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
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
        setSuccessMessage(`✅ ${platforms[selectedPlatform as keyof typeof platforms].name} connected successfully!`);
        setFormData({
          accountName: '',
          accountHandle: '',
          accountId: '',
          accountEmail: '',
          accessToken: '',
          refreshToken: '',
        });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to connect account');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPlatform = platforms[selectedPlatform as keyof typeof platforms];

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
              <p className="text-slate-400">Add your social media account credentials to start posting</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition"
                title="Go to Admin Home"
              >
                <Home size={20} />
                Home
              </button>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition"
                title="Go Back"
              >
                <ArrowLeft size={20} />
                Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Platform Selection */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold text-white mb-4">Select Platform</h2>
              <div className="space-y-3">
                {Object.entries(platforms).map(([key, platform]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlatform(key)}
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
                {successMessage && (
                  <div className="mb-6 p-4 bg-emerald-500 bg-opacity-20 border border-emerald-500 rounded-lg text-emerald-300">
                    {successMessage}
                  </div>
                )}

                <h2 className="text-2xl font-bold text-white mb-6">
                  {currentPlatform.icon} {currentPlatform.name} Setup
                </h2>

                {/* Instructions */}
                <div className="bg-slate-700 rounded-lg p-6 mb-8 border border-slate-600">
                  <h3 className="text-white font-bold mb-4">📖 How to Get Your Credentials:</h3>
                  <ol className="text-slate-300 text-sm space-y-2">
                    {currentPlatform.instructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Account Name */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Account Name *</label>
                    <input
                      type="text"
                      name="accountName"
                      placeholder="e.g., Swar Yoga Official"
                      value={formData.accountName}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-slate-400 text-sm mt-1">Name of your business/brand</p>
                  </div>

                  {/* Account Handle */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Account Handle *</label>
                    <input
                      type="text"
                      name="accountHandle"
                      placeholder="e.g., @swaryoga or swaryoga"
                      value={formData.accountHandle}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-slate-400 text-sm mt-1">Your username on this platform</p>
                  </div>

                  {/* Account/Page ID */}
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Account / Page ID{platforms[selectedPlatform as keyof typeof platforms].fields.includes('accountId') ? ' *' : ''}
                    </label>
                    <input
                      type="text"
                      name="accountId"
                      placeholder={
                        selectedPlatform === 'facebook'
                          ? 'Facebook Page ID (numeric)'
                          : selectedPlatform === 'instagram'
                          ? 'Instagram Business Account ID'
                          : selectedPlatform === 'youtube'
                          ? 'YouTube Channel ID'
                          : selectedPlatform === 'linkedin'
                          ? 'LinkedIn Organization/Page ID'
                          : 'Account/Page ID'
                      }
                      value={formData.accountId}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-slate-400 text-sm mt-1">
                      Needed to sync follower counts and to publish posts via official APIs.
                    </p>
                  </div>

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
                      <p className="text-slate-400 text-sm mt-1">Email associated with this Instagram account</p>
                    </div>
                  )}

                  {/* Access Token */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Access Token / API Key *</label>
                    <textarea
                      name="accessToken"
                      placeholder="Paste your access token, API key, or Bearer token here"
                      value={formData.accessToken}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                    />
                    <p className="text-slate-400 text-sm mt-1">🔒 Will be encrypted and stored securely</p>
                  </div>

                  {/* Refresh Token */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Refresh Token (Optional)</label>
                    <textarea
                      name="refreshToken"
                      placeholder="Paste refresh token if you have one"
                      value={formData.refreshToken}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                    />
                    <p className="text-slate-400 text-sm mt-1">Allows automatic token renewal</p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      {loading ? 'Connecting...' : `Connect ${currentPlatform.name}`}
                    </button>
                  </div>
                </form>

                {/* Security Note */}
                <div className="mt-8 pt-6 border-t border-slate-700">
                  <h4 className="text-white font-semibold mb-3">🔐 Security</h4>
                  <ul className="text-slate-300 text-sm space-y-2">
                    <li>✅ Your tokens are encrypted with AES-256</li>
                    <li>✅ Never stored in plain text</li>
                    <li>✅ Never sent to frontend or external services</li>
                    <li>✅ Only used to post on your behalf</li>
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
