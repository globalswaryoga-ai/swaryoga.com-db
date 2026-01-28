'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================
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

interface RecentSend {
  phone: string;
  template: string;
  time: Date;
  success: boolean;
  provider: 'meta' | 'qr';
  messageId?: string;
}

type Provider = 'meta' | 'qr';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function SendTemplatePage() {
  const token = useAuth();
  
  // Data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Input
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState<Provider>('meta');
  const [templateSearch, setTemplateSearch] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recentSends, setRecentSends] = useState<RecentSend[]>([]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  useEffect(() => {
    if (!token) return;

    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/admin/crm/templates', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const templatesList = data.data?.templates || data.templates || [];
        setTemplates(templatesList);
      } catch (err) {
        console.error('[SendTemplate] Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [token]);

  // ============================================================================
  // FILTERED TEMPLATES
  // ============================================================================
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(t =>
      t.templateName.toLowerCase().includes(q) ||
      t.templateContent.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  // ============================================================================
  // NORMALIZE PHONE
  // ============================================================================
  const normalizePhone = (input: string): string => {
    let phone = input.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    return phone;
  };

  // ============================================================================
  // SEND HANDLERS
  // ============================================================================
  const handleSend = async () => {
    if (!selectedTemplate || !phoneNumber.trim()) {
      setResult({ success: false, message: 'Please select a template and enter a phone number' });
      return;
    }

    const phone = normalizePhone(phoneNumber);
    if (phone.length < 10) {
      setResult({ success: false, message: 'Invalid phone number' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      if (provider === 'meta') {
        // ====================================================================
        // SEND VIA META CLOUD API
        // ====================================================================
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
          setResult({
            success: true,
            message: `✅ Template sent via Meta! Message ID: ${data.data?.waMessageId || 'N/A'}`
          });
          setRecentSends(prev => [{
            phone,
            template: selectedTemplate.templateName,
            time: new Date(),
            success: true,
            provider: 'meta',
            messageId: data.data?.waMessageId
          }, ...prev.slice(0, 9)]);
          setPhoneNumber('');
        } else {
          throw new Error(data.error || 'Failed to send via Meta');
        }
      } else {
        // ====================================================================
        // SEND VIA QR BRIDGE API
        // ====================================================================
        // Build message content for QR (text-based, no native buttons)
        const rawContent = selectedTemplate.templateContent || '';
        const templateContent = rawContent
          .replace(/•\s*\[QUICK_REPLY\][^\n]*/gi, '')
          .replace(/\[QUICK_REPLY\][^\n]*/gi, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        // Add button text as readable format
        const buttons = selectedTemplate.buttons || [];
        const buttonTexts = buttons
          .filter((b) => b.title)
          .map((b) => `📌 ${b.title}`)
          .join('\n');

        let fullMessage = templateContent;
        if (buttonTexts) fullMessage += `\n\n${buttonTexts}`;

        // Check for header image
        const headerMedia = selectedTemplate.headerMedia;
        const mediaUrl = headerMedia?.url || null;
        const hasImage = mediaUrl && headerMedia?.kind === 'image';

        // Build payload for QR send API
        const qrPayload: any = {
          to: phone,
          message: hasImage ? fullMessage : fullMessage,
          type: hasImage ? 'media' : 'text',
        };

        if (hasImage) {
          qrPayload.url = mediaUrl;
          qrPayload.caption = fullMessage;
        }

        console.log('[SendTemplate QR] Sending via API:', qrPayload);

        const res = await fetch('/api/admin/crm/whatsapp/qr/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(qrPayload),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setResult({
            success: true,
            message: `✅ Template sent via QR Bridge!`
          });
          setRecentSends(prev => [{
            phone,
            template: selectedTemplate.templateName,
            time: new Date(),
            success: true,
            provider: 'qr',
            messageId: data.messageId
          }, ...prev.slice(0, 9)]);
          setPhoneNumber('');
        } else {
          throw new Error(data.error || 'Failed to send via QR Bridge');
        }
      }
    } catch (err: any) {
      console.error('[SendTemplate] Error:', err);
      setResult({ success: false, message: `❌ ${err.message}` });
      setRecentSends(prev => [{
        phone,
        template: selectedTemplate?.templateName || '',
        time: new Date(),
        success: false,
        provider,
      }, ...prev.slice(0, 9)]);
    } finally {
      setSending(false);
    }
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================
  const canSend = selectedTemplate !== null && phoneNumber.trim().length >= 10;

  // ============================================================================
  // RENDER
  // ============================================================================
  if (token === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="text-gray-500 hover:text-gray-700 transition-all hover:-translate-x-1">
                ← CRM
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📨 Send Template
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/admin/crm/broadcast" className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium flex items-center gap-1">
                📢 <span className="hidden sm:inline">Broadcast</span>
              </Link>
              <Link href="/admin/crm/templates" className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all text-sm font-medium flex items-center gap-1">
                📝 <span className="hidden sm:inline">Templates</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Result Alert */}
        {result && (
          <div className={`mb-6 p-4 rounded-xl border-2 flex items-center justify-between ${
            result.success 
              ? 'bg-green-50 border-green-300 text-green-800' 
              : 'bg-red-50 border-red-300 text-red-800'
          }`}>
            <span className="font-medium">{result.message}</span>
            <button onClick={() => setResult(null)} className="text-lg hover:opacity-70 ml-4">×</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Template Selection */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">📋 Templates</h2>
              <span className="text-sm text-gray-500">{filteredTemplates.length}</span>
            </div>
            
            <input
              type="text"
              placeholder="🔍 Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                Loading...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-3xl">📝</span>
                <p className="mt-2 text-sm">No templates found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredTemplates.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                      selectedTemplate?._id === t._id
                        ? 'bg-blue-50 border-blue-400 shadow-md'
                        : 'bg-gray-50/50 border-transparent hover:bg-white hover:shadow-sm hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {t.headerMedia?.url && (
                        <img src={t.headerMedia.url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm group-hover:text-blue-700">
                            {t.templateName}
                          </span>
                          {t.headerFormat === 'IMAGE' && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">🖼️</span>
                          )}
                          {t.buttons?.length ? (
                            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">🔘</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.templateContent}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Middle: Send Form */}
          <div className="lg:col-span-1 space-y-4">
            {/* Provider Selection */}
            <div className="bg-white rounded-2xl shadow-xl border p-5">
              <h3 className="font-bold text-gray-800 mb-4">📡 Provider</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProvider('meta')}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 hover:shadow-md group ${
                    provider === 'meta' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🟢</div>
                  <div className="font-bold text-gray-800 text-sm">Meta</div>
                  <div className="text-xs text-green-600">✅ Native Buttons</div>
                </button>
                <button
                  onClick={() => setProvider('qr')}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 hover:shadow-md group ${
                    provider === 'qr' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💚</div>
                  <div className="font-bold text-gray-800 text-sm">QR Bridge</div>
                  <div className="text-xs text-orange-600">📝 Text Buttons</div>
                </button>
              </div>
              
              <div className={`mt-3 p-2 rounded-lg text-xs ${
                provider === 'meta' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
              }`}>
                {provider === 'meta' 
                  ? '✅ Native clickable buttons will appear in WhatsApp'
                  : '📝 Buttons will be sent as text (📌 Button Title)'}
              </div>
            </div>

            {/* Phone Input */}
            <div className="bg-white rounded-2xl shadow-xl border p-5">
              <h3 className="font-bold text-gray-800 mb-4">📱 Recipient</h3>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number (e.g. 9876543210)"
                className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">10-digit number or with country code</p>

              <button
                onClick={handleSend}
                disabled={!canSend || sending}
                className={`w-full mt-4 py-3.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  canSend && !sending
                    ? provider === 'meta'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/30 hover:scale-[1.02]'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {sending ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    {provider === 'meta' ? '🟢' : '💚'} Send via {provider === 'meta' ? 'Meta' : 'QR'}
                  </>
                )}
              </button>
            </div>

            {/* Recent Sends */}
            {recentSends.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border p-5">
                <h3 className="font-bold text-gray-800 mb-3">📊 Recent</h3>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {recentSends.map((send, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                        send.success ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{send.provider === 'meta' ? '🟢' : '💚'}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 truncate">{send.phone}</div>
                          <div className="text-xs text-gray-500 truncate">{send.template}</div>
                        </div>
                      </div>
                      <span className={send.success ? 'text-green-500' : 'text-red-500'}>
                        {send.success ? '✅' : '❌'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border p-5 sticky top-24">
              <h3 className="font-bold text-gray-800 mb-4">👁️ Message Card Preview</h3>

              {selectedTemplate ? (
                <div className="bg-[#0b141a] rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-3 text-center">
                    WhatsApp {provider === 'meta' ? 'Meta (Native)' : 'QR (Text)'}
                  </p>

                  {/* WhatsApp Card Style */}
                  <div className="bg-[#025c4c] rounded-2xl overflow-hidden max-w-xs mx-auto shadow-2xl">
                    {/* Header Image */}
                    {selectedTemplate.headerMedia?.url && (
                      <div className="relative">
                        <img
                          src={selectedTemplate.headerMedia.url}
                          alt=""
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-0.5 rounded text-xs text-white">
                          📷 Image
                        </div>
                      </div>
                    )}
                    
                    {/* Body Content */}
                    <div className="bg-[#005c4b] p-4">
                      <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedTemplate.templateContent}
                      </p>
                      
                      {/* QR shows buttons as text */}
                      {provider === 'qr' && selectedTemplate.buttons?.length ? (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          {selectedTemplate.buttons.map((btn, i) => (
                            <p key={i} className="text-white/90 text-sm py-1">
                              📌 {btn.title}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      
                      {/* Timestamp */}
                      <div className="flex justify-end mt-2">
                        <span className="text-xs text-white/60">
                          {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                        </span>
                      </div>
                    </div>

                    {/* Meta shows native blue buttons */}
                    {provider === 'meta' && selectedTemplate.buttons?.map((btn, i) => (
                      <div key={i} className="border-t border-[#0a3a3a]">
                        <button className="w-full py-3 text-[#53bdeb] text-sm font-medium text-center hover:bg-[#0a3a3a] transition-colors flex items-center justify-center gap-2">
                          <span>↩️</span>
                          {btn.title}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Provider Badge */}
                  <div className="mt-4 text-center">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                      provider === 'meta' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    }`}>
                      {provider === 'meta' ? '🟢 Meta Cloud API' : '💚 QR Bridge'}
                    </span>
                  </div>
                  
                  {/* Features */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className={`p-2 rounded-lg ${selectedTemplate.headerMedia?.url ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                      <span className="text-lg">{selectedTemplate.headerMedia?.url ? '✅' : '➖'}</span>
                      <p className="text-xs text-gray-300">Image</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <span className="text-lg">✅</span>
                      <p className="text-xs text-gray-300">Body</p>
                    </div>
                    <div className={`p-2 rounded-lg ${selectedTemplate.buttons?.length ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                      <span className="text-lg">{selectedTemplate.buttons?.length ? '✅' : '➖'}</span>
                      <p className="text-xs text-gray-300">Button</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                  <span className="text-5xl">📋</span>
                  <p className="mt-3 text-sm">Select a template to preview</p>
                </div>
              )}

              {/* Info */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-2 text-sm">💡 Provider Differences</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500">🟢</span>
                    <div>
                      <strong className="text-gray-700">Meta:</strong>
                      <span className="text-gray-600"> Native blue clickable buttons</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500">💚</span>
                    <div>
                      <strong className="text-gray-700">QR:</strong>
                      <span className="text-gray-600"> Buttons as 📌 text format</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
