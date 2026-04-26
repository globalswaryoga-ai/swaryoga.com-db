'use client';

import React, { useState } from 'react';
import { ArrowLeft, X, Mail, MessageCircle, Globe, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Integration {
  name: string;
  status: 'connected' | 'disconnected' | 'pending';
  icon: React.ElementType;
  color: string;
  description: string;
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    token?: string;
    webhookUrl?: string;
  };
}

export default function ProfileSettingsPage() {
  const [tab, setTab] = useState<'profile' | 'integrations'>('profile');
  const [showModal, setShowModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  
  const [profile, setProfile] = useState({
    companyName: 'My Business',
    email: 'admin@mybusiness.com',
    phone: '+91 9876543210',
    website: 'https://mybusiness.com',
    address: 'Mumbai, India',
    industry: 'E-commerce',
    employees: '5-10',
  });

  const [integrations, setIntegrations] = useState<Record<string, Integration>>({
    email: {
      name: 'Email Integration',
      status: 'disconnected',
      icon: Mail,
      color: 'text-red-500',
      description: 'Send emails directly from CRM',
      credentials: { apiKey: '', webhookUrl: '' },
    },
    telegram: {
      name: 'Telegram Bot',
      status: 'disconnected',
      icon: MessageCircle,
      color: 'text-blue-500',
      description: 'Connect your Telegram bot',
      credentials: { token: '', webhookUrl: '' },
    },
    landing: {
      name: 'Landing Page Builder',
      status: 'connected',
      icon: Globe,
      color: 'text-green-500',
      description: 'Create landing pages for lead capture',
      credentials: { apiKey: 'connected' },
    },
  });

  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleConnect = (integrationKey: string) => {
    setSelectedIntegration(integrationKey);
    setShowModal(true);
    setFormData({});
  };

  const handleSaveIntegration = () => {
    if (selectedIntegration && formData) {
      setIntegrations((prev) => ({
        ...prev,
        [selectedIntegration]: {
          ...prev[selectedIntegration],
          status: 'connected',
          credentials: { ...prev[selectedIntegration].credentials, ...formData },
        },
      }));
      setShowModal(false);
      setSelectedIntegration(null);
    }
  };

  const handleDisconnect = (integrationKey: string) => {
    setIntegrations((prev) => ({
      ...prev,
      [integrationKey]: {
        ...prev[integrationKey],
        status: 'disconnected',
        credentials: {},
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/crm" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>
          </div>
          <p className="text-gray-600">Manage your account and integrations</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab('profile')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              tab === 'profile'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Profile Settings
          </button>
          <button
            onClick={() => setTab('integrations')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              tab === 'integrations'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Integrations
          </button>
        </div>

        {/* Profile Settings Tab */}
        {tab === 'profile' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <select
                  value={profile.industry}
                  onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option>E-commerce</option>
                  <option>SaaS</option>
                  <option>Services</option>
                  <option>Education</option>
                  <option>Healthcare</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              <Save className="w-5 h-5" />
              Save Profile
            </button>
          </div>
        )}

        {/* Integrations Tab */}
        {tab === 'integrations' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Connected Services</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(integrations).map(([key, integration]) => {
                const Icon = integration.icon;
                return (
                  <div key={key} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <Icon className={`w-8 h-8 ${integration.color} flex-shrink-0 mt-1`} />
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{integration.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          integration.status === 'connected'
                            ? 'bg-green-100 text-green-800'
                            : integration.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                      </div>
                    </div>

                    {integration.status === 'connected' ? (
                      <button
                        onClick={() => handleDisconnect(key)}
                        className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(key)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Integration Modal with Close Button */}
      {showModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative">
            {/* Close Button (X) */}
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedIntegration(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-700 transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {integrations[selectedIntegration]?.name}
            </h2>
            <p className="text-gray-600 mb-6">{integrations[selectedIntegration]?.description}</p>

            <div className="space-y-4 mb-6">
              {selectedIntegration === 'email' && (
                <>
                  <input
                    type="text"
                    placeholder="SMTP Server"
                    value={formData.apiKey || ''}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="API Key"
                    value={formData.apiSecret || ''}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="Webhook URL"
                    value={formData.webhookUrl || ''}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </>
              )}

              {selectedIntegration === 'telegram' && (
                <>
                  <input
                    type="text"
                    placeholder="Bot Token"
                    value={formData.token || ''}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="Webhook URL"
                    value={formData.webhookUrl || ''}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-700">Get your token from BotFather on Telegram</p>
                  </div>
                </>
              )}

              {selectedIntegration === 'landing' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-medium">✓ Already Connected</p>
                  <p className="text-xs text-green-600 mt-2">Your landing page builder is ready to use</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedIntegration(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {selectedIntegration !== 'landing' && (
                <button
                  onClick={handleSaveIntegration}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
