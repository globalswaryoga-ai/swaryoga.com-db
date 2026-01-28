'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface Template {
  _id: string;
  templateName: string;
  templateContent: string;
  headerFormat?: string;
  headerMedia?: { kind: string; url: string };
  buttons?: { kind: string; title: string; url?: string }[];
  language?: string;
  status?: string;
}

export default function SendTemplatePage() {
  const router = useRouter();
  const token = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recentSends, setRecentSends] = useState<{ phone: string; template: string; time: Date; success: boolean }[]>([]);

  // Fetch templates
  useEffect(() => {
    if (!token) return;

    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/admin/crm/whatsapp/templates', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setTemplates(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [token]);

  const handleSend = async () => {
    if (!selectedTemplate || !phoneNumber.trim()) {
      setResult({ success: false, message: 'Please select a template and enter a phone number' });
      return;
    }

    // Normalize phone number
    let phone = phoneNumber.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/crm/whatsapp/send-template', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phone,
          templateId: selectedTemplate._id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult({ success: true, message: `✅ Template sent successfully! Message ID: ${data.data?.waMessageId || 'N/A'}` });
        setRecentSends(prev => [
          { phone, template: selectedTemplate.templateName, time: new Date(), success: true },
          ...prev.slice(0, 9),
        ]);
        setPhoneNumber('');
      } else {
        setResult({ success: false, message: `❌ Failed: ${data.error || 'Unknown error'}` });
        setRecentSends(prev => [
          { phone, template: selectedTemplate.templateName, time: new Date(), success: false },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (err: any) {
      setResult({ success: false, message: `❌ Error: ${err.message}` });
    } finally {
      setSending(false);
    }
  };

  if (token === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <nav className="bg-slate-800/50 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="flex items-center gap-3">
                <img src="/logo.png" alt="Swar Yoga" className="w-8 h-8 rounded-lg" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Send Template
                </h1>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/crm"
                className="px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-600 text-sm"
              >
                ← Back to CRM
              </Link>
              <Link
                href="/admin/crm/templates"
                className="px-4 py-2 bg-purple-600/60 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
              >
                📝 Manage Templates
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Template Selection */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-purple-500/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">📋 Select Template</h2>
            
            {loading ? (
              <div className="text-purple-200">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-yellow-400">No templates found. Create one first.</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {templates.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplate?._id === t._id
                        ? 'bg-purple-600/40 border-purple-400'
                        : 'bg-slate-700/50 border-slate-600 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {t.headerMedia?.url && (
                        <img
                          src={t.headerMedia.url}
                          alt=""
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{t.templateName}</span>
                          {t.headerFormat === 'IMAGE' && (
                            <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">🖼️ Image</span>
                          )}
                          {t.buttons?.length ? (
                            <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded">🔘 Button</span>
                          ) : null}
                        </div>
                        <p className="text-sm text-purple-200 mt-1 line-clamp-2">{t.templateContent}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Send Form & Preview */}
          <div className="space-y-6">
            {/* Preview */}
            {selectedTemplate && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-purple-500/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">👁️ Preview</h2>
                <div className="bg-[#e5ddd5] rounded-lg p-4 max-w-sm">
                  {/* WhatsApp-style message bubble */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    {selectedTemplate.headerMedia?.url && (
                      <img
                        src={selectedTemplate.headerMedia.url}
                        alt=""
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <p className="text-gray-800 text-sm whitespace-pre-wrap">
                        {selectedTemplate.templateContent}
                      </p>
                    </div>
                    {selectedTemplate.buttons?.map((btn, i) => (
                      <div key={i} className="border-t border-gray-200">
                        <button className="w-full py-2.5 text-[#00a5f4] text-sm font-medium hover:bg-gray-50">
                          🔗 {btn.title}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Send Form */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-purple-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">📤 Send to User</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-purple-200 mb-2 text-sm">Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number (e.g. 9876543210)"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">10-digit Indian number or with country code</p>
                </div>

                <button
                  onClick={handleSend}
                  disabled={sending || !selectedTemplate || !phoneNumber.trim()}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    sending || !selectedTemplate || !phoneNumber.trim()
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                  }`}
                >
                  {sending ? '⏳ Sending...' : '🚀 Send Template'}
                </button>

                {result && (
                  <div
                    className={`p-4 rounded-lg ${
                      result.success
                        ? 'bg-green-900/50 border border-green-500 text-green-200'
                        : 'bg-red-900/50 border border-red-500 text-red-200'
                    }`}
                  >
                    {result.message}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Sends */}
            {recentSends.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-purple-500/20 p-6">
                <h2 className="text-lg font-bold text-white mb-4">📊 Recent Sends</h2>
                <div className="space-y-2">
                  {recentSends.map((send, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        send.success ? 'bg-green-900/30' : 'bg-red-900/30'
                      }`}
                    >
                      <div>
                        <span className="text-white">{send.phone}</span>
                        <span className="text-gray-400 text-sm ml-2">({send.template})</span>
                      </div>
                      <span className={send.success ? 'text-green-400' : 'text-red-400'}>
                        {send.success ? '✅' : '❌'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
