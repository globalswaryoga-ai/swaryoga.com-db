'use client';

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Image,
  Type,
  Globe,
  Link2,
  Mail,
  Shield,
  Loader2,
  Save,
  Eye,
  Lock,
  Check,
  AlertCircle,
} from 'lucide-react';

interface BrandingSettings {
  logo: string;
  logoLight: string;
  favicon: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  borderRadius: string;
  customCSS: string;
  emailFooter: string;
  companyName: string;
  supportEmail: string;
  websiteUrl: string;
  privacyUrl: string;
  termsUrl: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  hidePoweredBy: boolean;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Lato', label: 'Lato' },
];

const RADIUS_OPTIONS = [
  { value: 'none', label: 'None (0px)', preview: 'rounded-none' },
  { value: 'sm', label: 'Small (4px)', preview: 'rounded-sm' },
  { value: 'md', label: 'Medium (8px)', preview: 'rounded-md' },
  { value: 'lg', label: 'Large (12px)', preview: 'rounded-lg' },
  { value: 'full', label: 'Full (999px)', preview: 'rounded-full' },
];

const COLOR_PRESETS = [
  { name: 'Default Purple', primary: '#667eea', accent: '#764ba2' },
  { name: 'Ocean Blue', primary: '#0ea5e9', accent: '#0369a1' },
  { name: 'Forest Green', primary: '#10b981', accent: '#059669' },
  { name: 'Sunset Orange', primary: '#f97316', accent: '#ea580c' },
  { name: 'Rose Pink', primary: '#f43f5e', accent: '#e11d48' },
  { name: 'Slate Gray', primary: '#475569', accent: '#334155' },
];

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [canWhiteLabel, setCanWhiteLabel] = useState(false);
  const [plan, setPlan] = useState('free');
  const [branding, setBranding] = useState<BrandingSettings>({
    logo: '',
    logoLight: '',
    favicon: '',
    primaryColor: '#667eea',
    accentColor: '#764ba2',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    fontFamily: 'Inter',
    borderRadius: 'lg',
    customCSS: '',
    emailFooter: '',
    companyName: '',
    supportEmail: '',
    websiteUrl: '',
    privacyUrl: '',
    termsUrl: '',
    socialLinks: {},
    hidePoweredBy: false,
  });
  const [activeTab, setActiveTab] = useState('colors');

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const tenantSlug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/branding?tenant=${tenantSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setBranding(data.branding);
        setCanWhiteLabel(data.canWhiteLabel);
        setPlan(data.plan);
      }
    } catch (err) {
      console.error('Failed to fetch branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const tenantSlug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch('/api/crm-site/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, branding }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save branding:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateBranding = (field: string, value: any) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="w-6 h-6 text-indigo-600" />
            White-Label Settings
          </h1>
          <p className="text-sm text-gray-500">Customize your CRM's appearance</p>
        </div>
        <button
          onClick={saveBranding}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Premium notice for non-Growth plans */}
      {!canWhiteLabel && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Premium Feature</p>
            <p className="text-sm text-amber-700">
              Custom CSS and "Hide Powered By" features require Growth or Professional plan. 
              Your current plan: <strong>{plan}</strong>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'colors', label: 'Colors', icon: Palette },
              { id: 'images', label: 'Images', icon: Image },
              { id: 'typography', label: 'Typography', icon: Type },
              { id: 'links', label: 'Links', icon: Link2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Color Presets</label>
                  <div className="grid grid-cols-3 gap-3">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          updateBranding('primaryColor', preset.primary);
                          updateBranding('accentColor', preset.accent);
                        }}
                        className={`p-3 rounded-xl border-2 transition ${
                          branding.primaryColor === preset.primary
                            ? 'border-indigo-500 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.primary }} />
                          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={e => updateBranding('primaryColor', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={branding.primaryColor}
                        onChange={e => updateBranding('primaryColor', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.accentColor}
                        onChange={e => updateBranding('accentColor', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={branding.accentColor}
                        onChange={e => updateBranding('accentColor', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
                  <div className="flex gap-2">
                    {RADIUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updateBranding('borderRadius', opt.value)}
                        className={`flex-1 py-2 px-3 text-sm font-medium border-2 transition ${
                          branding.borderRadius === opt.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${opt.preview}`}
                      >
                        {opt.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input
                    type="url"
                    value={branding.logo}
                    onChange={e => updateBranding('logo', e.target.value)}
                    placeholder="https://yourdomain.com/logo.png"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  {branding.logo && (
                    <div className="mt-2 p-4 bg-gray-50 rounded-xl">
                      <img src={branding.logo} alt="Logo preview" className="h-12 object-contain" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo (Light Version)</label>
                  <input
                    type="url"
                    value={branding.logoLight}
                    onChange={e => updateBranding('logoLight', e.target.value)}
                    placeholder="https://yourdomain.com/logo-light.png"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used on dark backgrounds</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                  <input
                    type="url"
                    value={branding.favicon}
                    onChange={e => updateBranding('favicon', e.target.value)}
                    placeholder="https://yourdomain.com/favicon.ico"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Typography Tab */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                  <select
                    value={branding.fontFamily}
                    onChange={e => updateBranding('fontFamily', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    style={{ fontFamily: branding.fontFamily }}
                  >
                    {FONT_OPTIONS.map(font => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={branding.companyName}
                    onChange={e => updateBranding('companyName', e.target.value)}
                    placeholder="Your Company Name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={branding.supportEmail}
                    onChange={e => updateBranding('supportEmail', e.target.value)}
                    placeholder="support@yourcompany.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Footer HTML</label>
                  <textarea
                    value={branding.emailFooter}
                    onChange={e => updateBranding('emailFooter', e.target.value)}
                    placeholder="<p>© 2026 Your Company. All rights reserved.</p>"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                </div>

                {/* Premium feature */}
                <div className={!canWhiteLabel ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        Hide "Powered by Swar Yoga"
                        {!canWhiteLabel && <Lock className="w-4 h-4 text-gray-400" />}
                      </p>
                      <p className="text-sm text-gray-500">Remove branding from emails and pages</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={branding.hidePoweredBy}
                      onChange={e => updateBranding('hidePoweredBy', e.target.checked)}
                      disabled={!canWhiteLabel}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Links Tab */}
            {activeTab === 'links' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={branding.websiteUrl}
                    onChange={e => updateBranding('websiteUrl', e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy URL</label>
                  <input
                    type="url"
                    value={branding.privacyUrl}
                    onChange={e => updateBranding('privacyUrl', e.target.value)}
                    placeholder="https://yourcompany.com/privacy"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms of Service URL</label>
                  <input
                    type="url"
                    value={branding.termsUrl}
                    onChange={e => updateBranding('termsUrl', e.target.value)}
                    placeholder="https://yourcompany.com/terms"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Social Links</label>
                  <div className="space-y-3">
                    {['facebook', 'twitter', 'instagram', 'linkedin', 'youtube'].map(social => (
                      <input
                        key={social}
                        type="url"
                        value={(branding.socialLinks as any)[social] || ''}
                        onChange={e => updateBranding('socialLinks', {
                          ...branding.socialLinks,
                          [social]: e.target.value,
                        })}
                        placeholder={`https://${social}.com/yourpage`}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Live Preview
              </h3>
              <div 
                className="rounded-xl border border-gray-200 overflow-hidden"
                style={{ fontFamily: branding.fontFamily }}
              >
                {/* Mock header */}
                <div 
                  className="p-4 flex items-center gap-3"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.logo ? (
                    <img src={branding.logo} alt="Logo" className="h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 bg-white/20 rounded-lg" />
                  )}
                  <span className="text-white font-semibold">
                    {branding.companyName || 'Your Company'}
                  </span>
                </div>
                
                {/* Mock content */}
                <div className="p-4">
                  <button
                    className="w-full py-2 text-white font-medium"
                    style={{ 
                      backgroundColor: branding.primaryColor,
                      borderRadius: branding.borderRadius === 'none' ? '0' :
                                   branding.borderRadius === 'sm' ? '4px' :
                                   branding.borderRadius === 'md' ? '8px' :
                                   branding.borderRadius === 'lg' ? '12px' : '999px'
                    }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="w-full py-2 mt-2 font-medium border"
                    style={{ 
                      color: branding.primaryColor,
                      borderColor: branding.primaryColor,
                      borderRadius: branding.borderRadius === 'none' ? '0' :
                                   branding.borderRadius === 'sm' ? '4px' :
                                   branding.borderRadius === 'md' ? '8px' :
                                   branding.borderRadius === 'lg' ? '12px' : '999px'
                    }}
                  >
                    Secondary Button
                  </button>
                </div>

                {/* Mock footer */}
                {!branding.hidePoweredBy && (
                  <div className="px-4 py-2 bg-gray-50 text-center text-xs text-gray-400">
                    Powered by Swar Yoga
                  </div>
                )}
              </div>
            </div>

            {/* Quick tips */}
            <div className="bg-indigo-50 rounded-2xl p-4">
              <h4 className="font-medium text-indigo-900 mb-2">💡 Tips</h4>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• Use contrasting colors for better readability</li>
                <li>• Upload SVG logos for best quality</li>
                <li>• Test on mobile devices</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
