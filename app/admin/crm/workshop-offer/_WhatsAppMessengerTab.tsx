import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, FileText, MessagesSquare, BarChart3, Plus, X, RefreshCw, Trash2, Edit2, ArrowRightLeft, Radio, Users } from 'lucide-react';
import CreateTemplatePage from '@/app/admin/crm/templates/builder/page';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { BroadcastNRTab } from '../new-registration/_BroadcastNRTab';
import MetaBroadcastPage from '@/app/admin/crm/broadcast/page';
import QRBroadcastPage from '@/app/admin/crm/qr/broadcast/page';
import GroupSchedulerPage from '@/app/admin/crm/qr/group-scheduler/page';
import ReportsTab from '../new-registration/_ReportsTab';

const WhatsAppTabs = [
  { id: 'meta_whatsapp', label: 'Meta WhatsApp', icon: MessageSquare },
  { id: 'qr_whatsapp', label: 'QR WhatsApp', icon: QrCode },
  { id: 'group_message', label: 'Group Message', icon: Users },
  { id: 'template', label: 'Template', icon: FileText },
  { id: 'all_messages', label: 'All Messages', icon: MessagesSquare },
  { id: 'broadcast_nr', label: 'Broadcast-NR', icon: Radio },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
] as const;

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'mr', name: 'Marathi' },
  { code: 'kn', name: 'Kannada' },
];

function getProxiedMediaUrl(url: string, authToken: string | null): string {
  if (!url) return url;
  // Proxy all URLs (including Bunny CDN) through our media proxy
  // This helps rewrite old Bunny CDN domains and handles private S3 bucket access
  if (authToken) {
    return `/api/admin/crm/media/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(authToken)}`;
  }
  return url;
}

export function WhatsAppMessengerTab({
  workshops = [],
  leadsData = [],
}: {
  workshops?: any[];
  leadsData?: any[];
}) {
  const [activeSubTab, setActiveSubTab] = useState<string>('meta_whatsapp');
  
  // Template Creation State
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [selectedTemplateLanguage, setSelectedTemplateLanguage] = useState('en');
  const [movingTemplateId, setMovingTemplateId] = useState<string | null>(null);
  const token = useAuth();
  const toast = useToast();

  // All Messages State
  const [allMessagesLang, setAllMessagesLang] = useState('en');
  const [syncLoading, setSyncLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const fetchTemplates = async () => {
    if (!token) return;
    setTemplatesLoading(true);
    try {
      const url = new URL('/api/admin/crm/templates', typeof window !== 'undefined' ? window.location.origin : '');
      url.searchParams.append('limit', '100');
      
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      if (data?.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'all_messages') {
      fetchTemplates();
    }
  }, [activeSubTab, token]);

  const handleSyncMetaTemplates = async () => {
    setSyncLoading(true);
    try {
      const url = new URL('/api/admin/crm/templates/meta/sync', typeof window !== 'undefined' ? window.location.origin : '');
      url.searchParams.append('import', 'true');

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();
      if (result?.success === false) {
        toast.error(result?.error || 'Sync failed');
      } else {
        const syncResults = result?.results || [];
        const imported = syncResults.filter((r: any) => r.action === 'imported').length;
        const updated = syncResults.filter((r: any) => r.action === 'updated').length;
        
        toast.success(`Sync completed! Imported: ${imported}, Updated: ${updated}`);
        fetchTemplates();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync templates from Meta');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const url = new URL('/api/admin/crm/templates', typeof window !== 'undefined' ? window.location.origin : '');
      url.searchParams.append('templateId', templateId);
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to delete template (Status ${response.status})`);
      }
      toast.success('Template deleted successfully!');
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting template');
    }
  };

  const handleMoveTemplateLanguage = async (templateId: string, newLangCode: string) => {
    try {
      const response = await fetch('/api/admin/crm/templates', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId,
          action: 'update',
          language: newLangCode
        })
      });
      
      if (!response.ok) throw new Error('Failed to move template');
      toast.success('Template moved successfully!');
      setMovingTemplateId(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error moving template');
    }
  };

  const startTemplateCreation = (langCode: string) => {
    setSelectedTemplateLanguage(langCode);
    setShowLanguagePopup(false);
    setIsCreatingTemplate(true);
  };

  const handleTemplateSaved = () => {
    toast.success('Template saved successfully!');
    setIsCreatingTemplate(false);
    setActiveSubTab('all_messages');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden m-6 animate-fade-in relative">
      {/* Sub-Header Tabs */}
      <div className="bg-slate-50 px-4 pt-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {WhatsAppTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                if (tab.id !== 'template') setIsCreatingTemplate(false);
              }}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <tab.icon size={16} className={activeSubTab === tab.id ? "text-green-600" : "text-slate-400"} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 relative">
        {activeSubTab === 'template' && !isCreatingTemplate && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-green-50 p-6 rounded-full mb-6 border border-green-100">
              <FileText className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Message Templates</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              Create and manage your WhatsApp message templates. These templates can be used to send rich messages to your leads.
            </p>
            <button
              onClick={() => setShowLanguagePopup(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all hover:scale-105"
            >
              <Plus size={20} /> Create New Template
            </button>
          </div>
        )}

        {activeSubTab === 'template' && isCreatingTemplate && (
          <div className="w-full h-full relative overflow-y-auto">
            <CreateTemplatePage 
              embeddedLanguage={selectedTemplateLanguage} 
              onSaveSuccess={handleTemplateSaved} 
            />
          </div>
        )}

        {activeSubTab === 'all_messages' && (
          <div className="flex h-full w-full">
            {/* Language Sidebar */}
            <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Language Filters</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setAllMessagesLang(lang.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${
                      allMessagesLang === lang.code
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Messages Content */}
            <div className="flex-1 flex flex-col bg-slate-50/50">
              <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-700">All Saved Messages</h2>
                  <p className="text-sm text-slate-500">
                    Displaying templates for <strong className="text-slate-700">{LANGUAGES.find(l => l.code === allMessagesLang)?.name}</strong>
                  </p>
                </div>
                <button
                  onClick={handleSyncMetaTemplates}
                  disabled={syncLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2"
                >
                  <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
                  {syncLoading ? 'Syncing...' : 'Sync from Meta'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {templatesLoading ? (
                  <div className="flex justify-center items-center h-full text-slate-400">Loading templates...</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {templates.filter(t => t.language === allMessagesLang).length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400">
                        <MessagesSquare className="w-12 h-12 mb-3 text-slate-300" />
                        <p>No templates found for this language.</p>
                      </div>
                    ) : (
                      templates.filter(t => t.language === allMessagesLang).map(template => (
                        <div key={template._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-800 text-lg pr-4">{template.name}</h3>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                                template.status === 'approved' ? 'bg-green-100 text-green-700' :
                                template.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {template.status.replace('_', ' ')}
                              </span>
                              <button 
                                onClick={() => {
                                  // Navigate to the existing meta templates page for editing
                                  window.location.href = `/admin/crm/meta/templates?edit=${template._id}`;
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Template"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => setMovingTemplateId(template._id)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Move to another language"
                              >
                                <ArrowRightLeft size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTemplate(template._id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Template"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          {(template.headerFormat === 'IMAGE' || template.headerMedia?.kind === 'image') && template.headerMedia?.url && (
                            <div className="mb-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-40">
                              <img 
                                src={getProxiedMediaUrl(template.headerMedia.url, token)} 
                                alt="Template Header" 
                                className="object-contain max-h-40 w-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          <div className="text-sm text-slate-600 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap line-clamp-3">
                            {template.content?.body || template.templateContent}
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                            <span>Category: {template.category}</span>
                            <span>Provider: {template.provider}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Meta WhatsApp — full broadcast page embedded */}
        {activeSubTab === 'meta_whatsapp' && (
          <div className="flex-1 overflow-auto">
            <React.Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading broadcast...</div>}>
              <MetaBroadcastPage isEmbedded={true} workshops={workshops} leadsData={leadsData} />
            </React.Suspense>
          </div>
        )}

        {/* QR WhatsApp — full QR broadcast wizard embedded */}
        {activeSubTab === 'qr_whatsapp' && (
          <div className="flex-1 overflow-auto">
            <React.Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading broadcast...</div>}>
              <QRBroadcastPage isEmbedded={true} workshops={workshops} leadsData={leadsData} />
            </React.Suspense>
          </div>
        )}

        {/* Group Message — full group scheduler embedded */}
        {activeSubTab === 'group_message' && (
          <div className="flex-1 overflow-auto">
            <GroupSchedulerPage />
          </div>
        )}

        {activeSubTab === 'reports' && (
          <div className="flex-1 overflow-auto">
            <ReportsTab />
          </div>
        )}

        {activeSubTab === 'broadcast_nr' && (
          <BroadcastNRTab workshops={workshops} leadsData={leadsData} />
        )}
      </div>

      {/* Language Selection Popup */}
      {showLanguagePopup && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FileText className="text-green-600" />
                Select Template Language
              </h3>
              <button onClick={() => setShowLanguagePopup(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">Choose the language for your new message template. It will be saved in the respective language section.</p>
              <div className="grid grid-cols-2 gap-3">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => startTemplateCreation(lang.code)}
                    className="p-4 border-2 border-slate-100 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all font-bold text-slate-700 hover:text-green-700 text-center"
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Template Language Popup */}
      {movingTemplateId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ArrowRightLeft className="text-amber-600" />
                Move Template to Language
              </h3>
              <button onClick={() => setMovingTemplateId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">Select the language category you want to move this template into.</p>
              <div className="grid grid-cols-2 gap-3">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    disabled={lang.code === allMessagesLang}
                    onClick={() => handleMoveTemplateLanguage(movingTemplateId, lang.code)}
                    className={`p-4 border-2 rounded-xl transition-all font-bold text-center ${
                      lang.code === allMessagesLang 
                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'border-slate-100 hover:border-amber-400 hover:bg-amber-50 text-slate-700 hover:text-amber-700'
                    }`}
                  >
                    {lang.name}
                    {lang.code === allMessagesLang && <span className="block text-[10px] font-normal mt-1 text-slate-400">(Current)</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
