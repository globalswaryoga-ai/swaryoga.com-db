'use client';

import React, { useState, useEffect } from 'react';

interface SocialAccount {
  _id: string;
  platform: string;
  account_name: string;
  account_handle: string;
  is_connected: boolean;
  followers_count?: number;
  verified?: boolean;
  connected_at: string;
}

interface AccountManagerProps {
  token: string;
}

export default function SocialAccountsManager({ token }: AccountManagerProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [platform, setPlatform] = useState('facebook');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      setLoading(true);
      const response = await fetch('/api/social/accounts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const { data } = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    // In production, this would use OAuth redirect
    // For now, we show a placeholder
    setIsConnecting(true);

    try {
      // Simulated OAuth flow
      const mockToken = `oauth_token_${Date.now()}`;
      const mockHandle = `@user_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch('/api/social/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          account_name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`,
          account_handle: mockHandle,
          access_token: mockToken,
        }),
      });

      if (response.ok) {
        await fetchAccounts();
        setShowConnect(false);
        alert(`✅ ${platform} account connected!`);
      }
    } catch (error) {
      alert('Failed to connect account');
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm('Disconnect this account?')) return;

    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchAccounts();
        alert('✅ Account disconnected');
      }
    } catch (error) {
      alert('Failed to disconnect account');
    }
  }

  const platformIcons: Record<string, string> = {
    facebook: '👍',
    instagram: '📷',
    twitter: '𝕏',
    linkedin: '💼',
    youtube: '📹',
    whatsapp: '💬',
    community: '👥',
  };

  const connectedPlatforms = accounts.map((a) => a.platform);
  const availablePlatforms = [
    'facebook',
    'instagram',
    'twitter',
    'linkedin',
    'youtube',
    'whatsapp',
    'community',
  ].filter((p) => !connectedPlatforms.includes(p));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🔗 Connected Accounts</h2>
        {availablePlatforms.length > 0 && (
          <button
            onClick={() => setShowConnect(true)}
            className="bg-yoga-600 hover:bg-yoga-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            + Add Account
          </button>
        )}
      </div>

      {/* Connected Accounts */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-yoga-200 border-t-yoga-600"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <span className="text-4xl mb-4 block">🔗</span>
          <p className="text-gray-600 mb-4">No accounts connected yet</p>
          <button
            onClick={() => setShowConnect(true)}
            className="bg-yoga-600 hover:bg-yoga-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Connect Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {accounts.map((account) => (
            <div
              key={account._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{platformIcons[account.platform]}</span>
                  <div>
                    <p className="font-bold text-gray-900 capitalize">{account.platform}</p>
                    <p className="text-sm text-gray-600">{account.account_handle}</p>
                  </div>
                </div>
                {account.verified && <span className="text-lg">✅</span>}
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account</span>
                  <span className="font-semibold">{account.account_name}</span>
                </div>
                {account.followers_count !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Followers</span>
                    <span className="font-semibold">{account.followers_count.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Connected</span>
                  <span className="font-semibold">
                    {new Date(account.connected_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDisconnect(account._id)}
                className="w-full text-red-600 hover:text-red-700 font-semibold py-2 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      {showConnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-6">🔗 Connect Account</h3>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500"
              >
                {availablePlatforms.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-900">
                You'll be redirected to {platform.charAt(0).toUpperCase() + platform.slice(1)} to authorize connection.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConnect(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex-1 bg-yoga-600 hover:bg-yoga-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
