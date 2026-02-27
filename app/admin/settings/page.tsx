'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { THEME_COLORS } from '@/lib/investment-constants';

interface AdminSettings {
  _id?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  logoUrl?: string;
  signatureUrl?: string;
  sealUrl?: string;
  adminName: string;
  adminTitle: string;
  bankName?: string;
  bankAccount?: string;
  bankIFSC?: string;
  certificateNote?: string;
  receiptNote?: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    companyName: 'Swar Yoga',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    adminName: '',
    adminTitle: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [sealFile, setSealFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [sealPreview, setSealPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          if (data.logoUrl) setLogoPreview(data.logoUrl);
          if (data.signatureUrl) setSignaturePreview(data.signatureUrl);
          if (data.sealUrl) setSealPreview(data.sealUrl);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'seal') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'logo') {
          setLogoFile(file);
          setLogoPreview(e.target?.result as string);
        } else if (type === 'signature') {
          setSignatureFile(file);
          setSignaturePreview(e.target?.result as string);
        } else {
          setSealFile(file);
          setSealPreview(e.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Upload images if selected
      if (logoFile || signatureFile || sealFile) {
        const formData = new FormData();
        if (logoFile) formData.append('logo', logoFile);
        if (signatureFile) formData.append('signature', signatureFile);
        if (sealFile) formData.append('seal', sealFile);

        const uploadResponse = await fetch('/api/admin/settings/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.logoUrl) settings.logoUrl = uploadData.logoUrl;
          if (uploadData.signatureUrl) settings.signatureUrl = uploadData.signatureUrl;
          if (uploadData.sealUrl) settings.sealUrl = uploadData.sealUrl;
        } else {
          throw new Error('Failed to upload images');
        }
      }

      // Save settings
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccess('Settings saved successfully!');
        setLogoFile(null);
        setSignatureFile(null);
        setSealFile(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: THEME_COLORS.BLUE }}>
          📋 Certificate & Receipt Settings
        </h1>
        <p className="text-gray-600">Manage branding, company details, and certificate customization</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          ✗ {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* Left Column: Forms */}
        <div>
          <div className="space-y-6">
            {/* Company Information */}
            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4" style={{ color: THEME_COLORS.BLUE }}>
                🏢 Company Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={settings.companyName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    name="companyAddress"
                    value={settings.companyAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="companyPhone"
                      value={settings.companyPhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="companyEmail"
                      value={settings.companyEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="companyWebsite"
                    value={settings.companyWebsite || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Admin Information */}
            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4" style={{ color: THEME_COLORS.ORANGE }}>
                👤 Admin Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="adminName"
                    value={settings.adminName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title/Designation</label>
                  <input
                    type="text"
                    name="adminTitle"
                    value={settings.adminTitle}
                    onChange={handleInputChange}
                    placeholder="e.g., Managing Director, CEO"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </section>

            {/* Bank Information */}
            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4" style={{ color: THEME_COLORS.RED }}>
                🏦 Bank Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    value={settings.bankName || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    name="bankAccount"
                    value={settings.bankAccount || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    name="bankIFSC"
                    value={settings.bankIFSC || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </section>

            {/* Custom Notes */}
            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4" style={{ color: THEME_COLORS.GREEN }}>
                📝 Custom Messages
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certificate Note (appears at bottom)
                  </label>
                  <textarea
                    name="certificateNote"
                    value={settings.certificateNote || ''}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="e.g., This certificate is valid for the duration of investment..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Note (appears at bottom)
                  </label>
                  <textarea
                    name="receiptNote"
                    value={settings.receiptNote || ''}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="e.g., Payment received via [payment mode]. Thank you for your investment..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right Column: Image Uploads */}
        <div>
          <div className="space-y-6">
            {/* Logo Upload */}
            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4" style={{ color: THEME_COLORS.BLUE }}>
                🎨 Company Logo
              </h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {logoPreview ? (
                  <div className="relative w-full h-40 mb-4">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 rounded flex items-center justify-center mb-4">
                    <p className="text-gray-400">No logo uploaded</p>
                  </div>
                )}

                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo')}
                    className="hidden"
                  />
                  <span className="block w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-center cursor-pointer hover:bg-blue-600">
                    📤 Upload Logo
                  </span>
                </label>

                <p className="text-xs text-gray-500 mt-2">Recommended: 200x80px, PNG/JPG</p>
              </div>
            </section>

            {/* Signature Upload */}
            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4" style={{ color: THEME_COLORS.ORANGE }}>
                ✍️ Admin Signature
              </h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {signaturePreview ? (
                  <div className="relative w-full h-40 mb-4">
                    <Image
                      src={signaturePreview}
                      alt="Signature preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 rounded flex items-center justify-center mb-4">
                    <p className="text-gray-400">No signature uploaded</p>
                  </div>
                )}

                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'signature')}
                    className="hidden"
                  />
                  <span className="block w-full px-4 py-2 bg-orange-500 text-white rounded-lg text-center cursor-pointer hover:bg-orange-600">
                    📤 Upload Signature
                  </span>
                </label>

                <p className="text-xs text-gray-500 mt-2">Recommended: 150x60px, PNG with transparent background</p>
              </div>
            </section>

            {/* Seal Upload */}
            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4" style={{ color: THEME_COLORS.RED }}>
                🔴 Company Seal / Stamp
              </h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {sealPreview ? (
                  <div className="relative w-full h-40 mb-4">
                    <Image
                      src={sealPreview}
                      alt="Seal preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 rounded flex items-center justify-center mb-4">
                    <p className="text-gray-400">No seal uploaded</p>
                  </div>
                )}

                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'seal')}
                    className="hidden"
                  />
                  <span className="block w-full px-4 py-2 bg-red-500 text-white rounded-lg text-center cursor-pointer hover:bg-red-600">
                    📤 Upload Seal
                  </span>
                </label>

                <p className="text-xs text-gray-500 mt-2">Recommended: 150x150px, PNG with transparent background</p>
              </div>
            </section>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
            >
              {saving ? '💾 Saving...' : '💾 Save All Settings'}
            </button>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Note:</strong> These settings will appear on all generated certificates and receipts.
                Make sure to upload high-quality images for professional appearance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
