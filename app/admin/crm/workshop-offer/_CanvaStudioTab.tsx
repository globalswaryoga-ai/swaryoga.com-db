import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Share2, Image as ImageIcon, Download, Search, CheckCircle, Info, ChevronDown, ChevronRight, Folder, CheckSquare, Eye, Plus, Trash2, Edit2 } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';

interface CanvaStudioTabProps {
  isCanvaConnected: boolean;
  leadsData?: any[];
}

export function CanvaStudioTab({ isCanvaConnected, leadsData = [] }: CanvaStudioTabProps) {
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<'meta' | 'receipts' | 'certificate' | 'downloads'>('receipts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedBatchForDownload, setSelectedBatchForDownload] = useState<string | null>(null);
  const [crmOfferData, setCrmOfferData] = useState<Record<string, any>>({});
  const [expandedBatches, setExpandedBatches] = useState<string[]>([]);
  const [downloadTab, setDownloadTab] = useState<'meta' | 'receipts' | 'certificate'>('receipts');
  const [selectedForDownload, setSelectedForDownload] = useState<string[]>([]);
  const [canvaDesigns, setCanvaDesigns] = useState<any[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [designError, setDesignError] = useState('');
  const [generatedDesignId, setGeneratedDesignId] = useState<string | null>(null);

  const [metaPrompt, setMetaPrompt] = useState<string>('');
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const [generatedAiText, setGeneratedAiText] = useState<any>(null);
  const [generatedAiImage, setGeneratedAiImage] = useState<string | null>(null);

  const [metaLanguagesList, setMetaLanguagesList] = useState<string[]>(['English', 'Hindi', 'Marathi', 'Kannada']);
  const [metaLanguage, setMetaLanguage] = useState<string>('English');
  const [metaPlatformsList] = useState<string[]>(['FB', 'Insta', 'YouTube', '1:1', 'PDF']);
  const [metaPlatform, setMetaPlatform] = useState<string>('FB');
  const [metaTemplatesMap, setMetaTemplatesMap] = useState<Record<string, string>>({});
  const [savedMetaAds, setSavedMetaAds] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLangs = localStorage.getItem('meta_languages');
      if (storedLangs) setMetaLanguagesList(JSON.parse(storedLangs));
      
      const storedMap = localStorage.getItem('meta_templates_map');
      if (storedMap) setMetaTemplatesMap(JSON.parse(storedMap));
      
      const storedAds = localStorage.getItem('saved_meta_ads');
      if (storedAds) setSavedMetaAds(JSON.parse(storedAds));
    }
  }, []);

  const handleEditLanguage = (oldLang: string) => {
    const newLang = prompt('Enter new language name:', oldLang);
    if (newLang && newLang.trim() && newLang.trim() !== oldLang) {
      const newLangs = metaLanguagesList.map(l => l === oldLang ? newLang.trim() : l);
      setMetaLanguagesList(newLangs);
      if (typeof window !== 'undefined') localStorage.setItem('meta_languages', JSON.stringify(newLangs));
      if (metaLanguage === oldLang) setMetaLanguage(newLang.trim());
    }
  };

  const handleAddLanguage = () => {
    const lang = prompt('Enter new language name:');
    if (lang && lang.trim()) {
      const newLangs = [...metaLanguagesList, lang.trim()];
      setMetaLanguagesList(newLangs);
      if (typeof window !== 'undefined') localStorage.setItem('meta_languages', JSON.stringify(newLangs));
    }
  };

  const handleDeleteLanguage = (lang: string) => {
    if (confirm(`Are you sure you want to delete ${lang}?`)) {
      const newLangs = metaLanguagesList.filter(l => l !== lang);
      setMetaLanguagesList(newLangs);
      if (typeof window !== 'undefined') localStorage.setItem('meta_languages', JSON.stringify(newLangs));
      if (metaLanguage === lang) setMetaLanguage(newLangs[0] || '');
    }
  };

  const handleUpdateTemplate = (val: string) => {
    const newMap = { ...metaTemplatesMap, [metaPlatform]: val };
    setMetaTemplatesMap(newMap);
    if (typeof window !== 'undefined') localStorage.setItem('meta_templates_map', JSON.stringify(newMap));
  };


  const handleGenerateMetaAI = async () => {
    if (!metaPrompt.trim()) {
      alert('Please enter a description for the ad');
      return;
    }
    
    setIsGeneratingMeta(true);
    setGeneratedAiText(null);
    setGeneratedAiImage(null);
    setGeneratedDesignId(null);
    
    try {
      const targetTemplateId = metaTemplatesMap[metaPlatform];
      if (!targetTemplateId) {
        alert(`Please enter a Canva Template ID for ${metaPlatform}`);
        setIsGeneratingMeta(false);
        return;
      }
      const fullPrompt = `Target Language: ${metaLanguage}\nPlatform: ${metaPlatform}\n\n${metaPrompt}`;
      

      const res = await fetch('/api/admin/canva/meta-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, templateId: targetTemplateId })
      });

      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate content');
      
      setGeneratedAiText(data.content);
      
      if (data.canvaDesignId) {
          setGeneratedDesignId(data.canvaDesignId);
          // Auto-save the generated ad
          const newAd = {
            id: Date.now().toString(),
            prompt: metaPrompt,
            language: metaLanguage,
            platform: metaPlatform,
            text: data.content,
            imageUrl: data.imageUrl,
            designId: data.canvaDesignId,
            createdAt: new Date().toISOString()
          };
          const updatedAds = [newAd, ...savedMetaAds];
          setSavedMetaAds(updatedAds);
          if (typeof window !== 'undefined') localStorage.setItem('saved_meta_ads', JSON.stringify(updatedAds));
      }
      
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGeneratingMeta(false);
    }
  };


  useEffect(() => {
    const saved = localStorage.getItem('crm_offer_data');
    if (saved) {
      try {
        setCrmOfferData(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'meta' && isCanvaConnected) {
      fetchCanvaDesigns();
    }
  }, [activeSection, isCanvaConnected]);

  const fetchCanvaDesigns = async () => {
    try {
      setIsLoadingDesigns(true);
      setDesignError('');
      const res = await fetch('/api/admin/canva/designs');
      if (!res.ok) {
        throw new Error('Failed to fetch designs');
      }
      const data = await res.json();
      setCanvaDesigns(data.items || []);
    } catch (err: any) {
      console.error(err);
      setDesignError('Could not load designs. You may need to reconnect Canva.');
    } finally {
      setIsLoadingDesigns(false);
    }
  };

  // Filter to only show leads that have been PUSHED
  const pushedLeads = useMemo(() => {
    return leadsData.filter(lead => {
      const data = crmOfferData[lead.id || lead._id];
      return data && data.pushedToCreateReceipts === true;
    });
  }, [leadsData, crmOfferData]);

  // Group pushed leads by Batch
  const batches = useMemo(() => {
    const groups: Record<string, any[]> = {};
    pushedLeads.forEach(lead => {
      const leadId = lead.id || lead._id;
      const data = crmOfferData[leadId] || {};
      
      const dateStr = data.date || new Date().toISOString();
      const d = new Date(dateStr);
      let batchName = `${d.toLocaleString('default', { month: 'long' }).toUpperCase()} ${d.getFullYear()}`;
      
      if (batchName === 'INVALID DATE NaN') {
         batchName = `${new Date().toLocaleString('default', { month: 'long' }).toUpperCase()} ${new Date().getFullYear()}`;
      }
      
      if (!groups[batchName]) groups[batchName] = [];
      groups[batchName].push(lead);
    });
    
    if (Object.keys(groups).length > 0 && expandedBatches.length === 0) {
      setExpandedBatches([Object.keys(groups)[0]]);
    }
    
    if (Object.keys(groups).length > 0 && !selectedBatchForDownload) {
      setSelectedBatchForDownload(Object.keys(groups)[0]);
    }
    
    return groups;
  }, [pushedLeads, crmOfferData]);

  const toggleBatch = (batch: string) => {
    setExpandedBatches(prev => prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch]);
  };

  const selectedLead = useMemo(() => {
    return pushedLeads.find(l => l.id === selectedLeadId || l._id === selectedLeadId);
  }, [pushedLeads, selectedLeadId]);

  const leadsInSelectedBatch = useMemo(() => {
    if (!selectedBatchForDownload) return [];
    return batches[selectedBatchForDownload] || [];
  }, [batches, selectedBatchForDownload]);

  // Handle select all for downloads
  const handleSelectAllDownloads = () => {
    if (selectedForDownload.length === leadsInSelectedBatch.length) {
      setSelectedForDownload([]);
    } else {
      setSelectedForDownload(leadsInSelectedBatch.map(l => l.id || l._id));
    }
  };

  const toggleDownloadSelection = (id: string) => {
    setSelectedForDownload(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Extractions
  const getReceiptData = (lead: any) => {
    if (!lead) return null;
    const leadId = lead.id || lead._id;
    const receivedData = crmOfferData[leadId] || {};
    let amount = receivedData.amount || lead.amount || lead.payment || lead['Offer-1'] || lead['Offer-2'] || '₹1,500';
    if (typeof amount === 'string' && amount.toLowerCase().includes('offer')) amount = '₹1,500';
    
    // Find lead index in batches to get a consistent sequential number
    let srNo = 1;
    for (const batch of Object.values(batches) as any[][]) {
       const index = batch.findIndex(l => (l.id || l._id) === leadId);
       if (index !== -1) {
          srNo = index + 1;
          break;
       }
    }
    
    let rawPrefix = typeof window !== 'undefined' ? (localStorage.getItem('canvaReceiptPrefix') || '') : '';
    // Strip trailing digits so if they type SW2609/M001, we just use SW2609/M and append the real sequence
    const prefix = rawPrefix.replace(/\d+$/, '');
    const finalPrefix = prefix || `RCPT-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}-`;
    
    return {
      name: lead.name || lead.Name || receivedData.name || 'Unknown',
      whatsapp: lead.whatsapp || lead.mobile || lead.Mobile || receivedData.phone || 'Unknown',
      amount: amount,
      paymentMode: receivedData.paymentMode || lead.paymentMode || lead.payment_mode || 'UPI / Online',
      paymentDetails: receivedData.transactionId || lead.paymentDetails || lead.transactionId || 'N/A',
      workshopName: lead.workshopName || lead.workshop_name || lead.course || 'Swar Yoga L-1',
      receiptNumber: `${finalPrefix}${srNo.toString().padStart(3,'0')}`
    };
  };

  const getCertificateData = (lead: any) => {
    if (!lead) return null;
    const d = new Date();
    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    const lang = (lead.language || 'EN').substring(0, 2).toUpperCase();
    const srNo = Math.floor(Math.random()*1000).toString().padStart(3,'0');
    
    return {
      firstName: lead.name || lead.Name || 'Participant Name',
      fullName: lead.name || lead.Name || 'Participant Name',
      city: lead.city || lead.City || 'Unknown City',
      country: lead.country || lead.Country || 'Unknown Country',
      batchName: `${month} ${year}`, 
      workshopName: lead.workshopName || lead.workshop_name || lead.course || 'Swar Yoga L-1',
      certificateNumber: `${year}${month}${lang}${srNo}`
    };
  };

  const receiptData = activeSection === 'receipts' ? getReceiptData(selectedLead) : null;
  const certificateData = activeSection === 'certificate' ? getCertificateData(selectedLead) : null;

  return (
    <div className="flex flex-col min-h-full w-full bg-slate-50 overflow-auto">
      {/* Top Navigation Header */}
      <div className="w-full bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between flex-shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-6">
          <h2 className="font-black text-slate-800 flex items-center gap-2 mr-4">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </span>
            Canva Studio
          </h2>
          
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            
             <button 
               onClick={() => {
                 setActiveSection('downloads');
                 setDownloadTab('meta');
               }}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === 'downloads' && downloadTab === 'meta' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'}`}
             >
               <ImageIcon size={16} className={activeSection === 'downloads' && downloadTab === 'meta' ? 'text-indigo-600' : 'text-slate-400'} />
               Meta Advertise
             </button>
             <button 
               onClick={() => setActiveSection('receipts')}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === 'receipts' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'}`}
             >
               <FileText size={16} className={activeSection === 'receipts' ? 'text-indigo-600' : 'text-slate-400'} />
               Receipts
             </button>
            <button 
              onClick={() => setActiveSection('certificate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === 'certificate' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'}`}
            >
              <Share2 size={16} className={activeSection === 'certificate' ? 'text-indigo-600' : 'text-slate-400'} />
              Certificate
            </button>
              <button 
                onClick={() => { setActiveSection('downloads'); setDownloadTab('receipts'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === 'downloads' && downloadTab !== 'meta' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'}`}
             >
               <Download size={16} className={activeSection === 'downloads' && downloadTab !== 'meta' ? 'text-indigo-600' : 'text-slate-400'} />
               Downloads
             </button>
          </div>
        </div>

        {/* Global Canva Settings */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shadow-inner">
          <input 
            type="text" 
            id="header-receipt-prefix"
            className="w-24 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400" 
            placeholder="RCPT-" 
            defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('canvaReceiptPrefix') || '') : ''}
          />
          <input 
            type="text" 
            id="header-canva-id"
            className="w-36 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400" 
            placeholder="Canva ID" 
            defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('canvaReceiptTemplateId') || 'DAGw5Hx3Vmo') : 'DAGw5Hx3Vmo'}
          />
          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                const prefix = (document.getElementById('header-receipt-prefix') as HTMLInputElement)?.value;
                const templateId = (document.getElementById('header-canva-id') as HTMLInputElement)?.value;
                localStorage.setItem('canvaReceiptPrefix', prefix);
                localStorage.setItem('canvaReceiptTemplateId', templateId);
                const btn = document.getElementById('header-save-btn');
                if (btn) {
                  const original = btn.innerText;
                  btn.innerText = 'Saved!';
                  btn.classList.add('bg-emerald-500', 'text-white');
                  btn.classList.remove('bg-indigo-100', 'text-indigo-700');
                  setTimeout(() => {
                    btn.innerText = original;
                    btn.classList.remove('bg-emerald-500', 'text-white');
                    btn.classList.add('bg-indigo-100', 'text-indigo-700');
                  }, 2000);
                }
              }
            }}
            id="header-save-btn"
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden bg-white max-w-[1600px] mx-auto w-full min-h-0">
        
        {/* Inner Sidebar: Batch and Lead Selection */}
        {!(activeSection === 'downloads' && downloadTab === 'meta') && (
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
             <div className="p-5 border-b border-slate-100">
                <h3 className="font-black text-slate-800 text-lg tracking-tight">
                  {activeSection === 'downloads' ? 'Filter by Batch' : 'Select Participant'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {activeSection === 'downloads' 
                    ? 'Choose a batch to view files' 
                    : `Choose a lead to generate ${activeSection === 'receipts' ? 'receipt' : 'certificate'}`}
                </p>
                
                {activeSection !== 'downloads' && (
                  <div className="mt-4 relative">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                    />
                  </div>
                )}
             </div>
             
             <div className="flex-1 overflow-y-auto p-3">
                {Object.keys(batches).length > 0 ? (
                  Object.entries(batches).map(([batchName, leads]) => {
                    
                    if (activeSection === 'downloads') {
                      const isSelected = selectedBatchForDownload === batchName;
                      return (
                        <div key={batchName} className="mb-2">
                          <button 
                            onClick={() => setSelectedBatchForDownload(batchName)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${isSelected ? 'bg-indigo-50 border border-indigo-100 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                          >
                            <span className={`font-black text-sm tracking-tight ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{batchName}</span>
                            <span className={`${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'} px-2 py-0.5 rounded-md text-[10px] font-bold`}>
                              {leads.length}
                            </span>
                          </button>
                        </div>
                      )
                    }

                    const isExpanded = expandedBatches.includes(batchName) || searchQuery.length > 0;
                    const visibleLeads = leads.filter(l => {
                       if (!searchQuery) return true;
                       const name = String(l.name || l.Name || '').toLowerCase();
                       return name.includes(searchQuery.toLowerCase());
                    });
                    
                    if (visibleLeads.length === 0) return null;
                    
                    return (
                      <div key={batchName} className="mb-3">
                        <button 
                          onClick={() => toggleBatch(batchName)}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? 
                              <ChevronDown size={16} className="text-indigo-600" /> : 
                              <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
                            }
                            <span className="font-black text-sm text-slate-700 tracking-tight">{batchName}</span>
                          </div>
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            {leads.length}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-100 space-y-1">
                            {visibleLeads.map(lead => {
                              const isSelected = selectedLeadId === (lead.id || lead._id);
                              return (
                                <button
                                  key={lead.id || lead._id}
                                  onClick={() => setSelectedLeadId(lead.id || lead._id)}
                                  className={`w-full text-left p-2.5 rounded-lg text-sm font-medium transition-all ${
                                    isSelected 
                                      ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100/50' 
                                      : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                                  }`}
                                >
                                  <div className="truncate">{lead.name || lead.Name || 'Unknown'}</div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Info size={24} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium">No leads pushed yet.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Working Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
           
           {/* META WORK */}
           {activeSection === 'meta' && (
              <div className="max-w-4xl mx-auto flex flex-col h-full">
                 <div className="mb-8">
                   <h3 className="text-3xl font-black text-slate-800 tracking-tight">Meta Work Studio</h3>
                   <p className="text-slate-500 mt-2 text-lg">Create Facebook ads, YouTube thumbnails, and Instagram templates.</p>
                 </div>
                 
                 <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-6 overflow-hidden">
                    {isLoadingDesigns ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                        <p className="font-medium">Loading your Canva designs...</p>
                      </div>
                    ) : designError ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-red-400">
                        <Info size={24} className="mb-2" />
                        <p className="font-medium">{designError}</p>
                        <button 
                          onClick={() => window.location.href = '/api/admin/canva/oauth'}
                          className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm"
                        >
                          Reconnect Canva
                        </button>
                      </div>
                    ) : canvaDesigns.length > 0 ? (
                      <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-6">
                          {canvaDesigns.map((design, i) => (
                            <div key={design.id || i} className="group relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                              <div className="aspect-video bg-slate-200 relative">
                                {design.thumbnail?.url ? (
                                  <img src={design.thumbnail.url} alt={design.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="text-slate-400 h-8 w-8" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors"></div>
                              </div>
                              <div className="p-4">
                                <h5 className="font-bold text-slate-700 truncate">{design.title || 'Untitled Design'}</h5>
                                <p className="text-xs text-slate-500 mt-1">ID: {design.id}</p>
                              </div>
                              <a 
                                href={design.urls?.edit_url || `https://canva.com/design/${design.id}/edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 bg-white/90 backdrop-blur text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                              >
                                Edit in Canva
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <ImageIcon className="h-20 w-20 text-indigo-100 mb-6" />
                        <h4 className="text-xl font-bold text-slate-700 mb-3">No Designs Found</h4>
                        <p className="text-slate-500 text-center max-w-md mb-8">
                          You don't have any designs in your Canva account yet, or the app doesn't have permission to view them.
                        </p>
                        <a href="https://canva.com" target="_blank" rel="noopener noreferrer" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                          Create a Design
                        </a>
                      </div>
                    )}
                 </div>
              </div>
           )}

           {/* RECEIPTS & CERTIFICATES */}
           {(activeSection === 'receipts' || activeSection === 'certificate') && (
              <div className="flex flex-col min-h-full max-w-7xl mx-auto">
                 <div className="mb-8">
                   <h3 className="text-3xl font-black text-slate-800 tracking-tight flex items-center justify-between">
                     <span>{activeSection === 'receipts' ? 'Receipt Generator' : 'Certificate Generator'}</span>
                     
                   </h3>
                   <p className="text-slate-500 mt-2 text-lg">
                     {activeSection === 'receipts' 
                       ? 'Review participant data and generate a customized receipt.' 
                       : 'Review participant data and generate a customized certificate.'}
                   </p>
                 </div>
                 
                 {!selectedLead ? (
                   <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center p-12">
                      <div className="bg-indigo-50 p-4 rounded-full mb-6">
                        <Search className="h-12 w-12 text-indigo-400" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-700 mb-3">Select a Participant</h4>
                      <p className="text-slate-500 text-center max-w-md">
                        Choose a name from the batch list on the left to review their data and open the Canva editor.
                      </p>
                   </div>
                 ) : (
                   <div className="flex gap-8 h-auto min-h-[600px] pb-24">
                     {/* Data Form Preview */}
                     <div className="w-80 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col shrink-0">
                       <h4 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2">
                         <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                         {activeSection === 'receipts' ? 'Receipt Data' : 'Certificate Data'}
                       </h4>
                                           <div className="flex-1 overflow-y-auto pr-2 space-y-5" key={selectedLead?._id || selectedLead?.id}>
                         {activeSection === 'receipts' && receiptData && (
                           <>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Name</label>
                               <input id="receipt-name" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700" defaultValue={receiptData.name} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">WhatsApp</label>
                               <input id="receipt-whatsapp" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700" defaultValue={receiptData.whatsapp} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Amount</label>
                               <input id="receipt-amount" type="text" className="w-full bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-black text-emerald-700 text-lg" defaultValue={receiptData.amount} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Payment Mode</label>
                               <input id="receipt-mode" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 uppercase" defaultValue={receiptData.paymentMode} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Payment Details</label>
                               <input id="receipt-details" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 text-sm truncate" defaultValue={receiptData.paymentDetails} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Workshop Name</label>
                               <input id="receipt-workshop" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 text-sm" defaultValue={receiptData.workshopName} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-1.5 block">Canva Template ID</label>
                               <input id="global-template-id" type="text" className="w-full bg-indigo-50 p-3 rounded-xl border border-indigo-200 font-mono font-bold text-indigo-700" defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('canvaReceiptTemplateId') || 'DAGw5Hx3Vmo') : 'DAGw5Hx3Vmo'} onChange={(e) => { if (typeof window !== 'undefined') localStorage.setItem('canvaReceiptTemplateId', e.target.value); }} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-1.5 block">Receipt No.</label>
                               <input id="receipt-number" type="text" className="w-full bg-indigo-50 p-3 rounded-xl border border-indigo-200 font-mono font-bold text-indigo-700" defaultValue={receiptData.receiptNumber} />
                             </div>
                           </>
                         )}
                         
                         {activeSection === 'certificate' && certificateData && (
                           <>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Name (Big Letters)</label>
                               <input id="cert-firstname" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-black text-slate-800 text-xl uppercase" defaultValue={certificateData.firstName} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Full Name</label>
                               <input id="cert-fullname" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700" defaultValue={certificateData.fullName} />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                 <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">City</label>
                                 <input id="cert-city" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 text-sm" defaultValue={certificateData.city} />
                               </div>
                               <div>
                                 <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Country</label>
                                 <input id="cert-country" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 text-sm" defaultValue={certificateData.country} />
                               </div>
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Batch Name</label>
                               <input id="cert-batch" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700" defaultValue={certificateData.batchName} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Workshop Name</label>
                               <input id="cert-workshop" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 text-sm" defaultValue={certificateData.workshopName} />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-1.5 block">Certificate No.</label>
                               <input id="cert-number" type="text" className="w-full bg-indigo-50 p-3 rounded-xl border border-indigo-200 font-mono font-bold text-indigo-700" defaultValue={certificateData.certificateNumber} />
                             </div>
                           </>
                         )}
                       </div>

                       <button 
                         onClick={async () => {
                           const btn = document.getElementById('btn-generate-canva');
                           if (btn) btn.innerText = 'Generating...';
                           
                           try {
                             const templateId = (document.getElementById('global-template-id') as HTMLInputElement)?.value || localStorage.getItem('canvaReceiptTemplateId') || 'DAGw5Hx3Vmo';
                             if (!templateId) {
                               alert('Please enter a Brand Template ID at the top right of this screen.');
                               if (btn) btn.innerText = 'Generate in Canva';
                               return;
                             }
                             
                             let dataToFill = {};
                             if (activeSection === 'receipts') {
                               dataToFill = {
                                 Name: { type: 'text', text: (document.getElementById('receipt-name') as HTMLInputElement)?.value || '' },
                                 Amount: { type: 'text', text: (document.getElementById('receipt-amount') as HTMLInputElement)?.value || '' },
                                 Mode: { type: 'text', text: (document.getElementById('receipt-mode') as HTMLInputElement)?.value || '' },
                                 ReceiptNo: { type: 'text', text: (document.getElementById('receipt-number') as HTMLInputElement)?.value || '' },
                                 WorkshopName: { type: 'text', text: (document.getElementById('receipt-workshop') as HTMLInputElement)?.value || '' }
                               };
                             } else if (activeSection === 'certificate') {
                               dataToFill = {
                                 FirstName: { type: 'text', text: (document.getElementById('cert-firstname') as HTMLInputElement)?.value || '' },
                                 FullName: { type: 'text', text: (document.getElementById('cert-fullname') as HTMLInputElement)?.value || '' },
                                 City: { type: 'text', text: (document.getElementById('cert-city') as HTMLInputElement)?.value || '' },
                                 Country: { type: 'text', text: (document.getElementById('cert-country') as HTMLInputElement)?.value || '' },
                                 BatchName: { type: 'text', text: (document.getElementById('cert-batch') as HTMLInputElement)?.value || '' },
                                 WorkshopName: { type: 'text', text: (document.getElementById('cert-workshop') as HTMLInputElement)?.value || '' },
                                 CertificateNo: { type: 'text', text: (document.getElementById('cert-number') as HTMLInputElement)?.value || '' }
                               };
                             }
                             
                             const res = await fetch('/api/admin/canva/autofill', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ templateId, data: dataToFill })
                             });
                             
                             const json = await res.json();
                             if (json.error) throw new Error(json.error);
                             
                             const jobId = json.job.id;
                             
                             // Poll status
                             const poll = setInterval(async () => {
                               const statusRes = await fetch(`/api/admin/canva/autofill/status?jobId=${jobId}`);
                               const statusJson = await statusRes.json();
                               
                               if (statusJson.job.status === 'success') {
                                 clearInterval(poll);
                                 if (btn) btn.innerText = 'Opening Design...';
                                 const designId = statusJson.job.result.design.id;
                                  
                                  setGeneratedDesignId(designId);
                                 window.open(`https://www.canva.com/design/${designId}/edit`, '_blank');
                                 if (btn) btn.innerText = 'Generate in Canva';
                               } else if (statusJson.job.status === 'failed') {
                                 clearInterval(poll);
                                 alert('Canva failed to generate the design.');
                                 if (btn) btn.innerText = 'Generate in Canva';
                               }
                             }, 2000);
                             
                           } catch (error: any) {
                             alert(error.message);
                             if (btn) btn.innerText = 'Generate in Canva';
                           }
                         }}
                         id="btn-generate-canva"
                         className="mt-6 py-3.5 rounded-xl font-black text-sm w-full transition-all bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5"
                       >
                         Generate in Canva
                       </button>
                     </div>

                     {/* Canva Embed Area */}
                     <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center p-8 relative overflow-hidden">
                        {generatedDesignId ? (
                          <iframe 
                            src={`https://www.canva.com/design/${generatedDesignId}/view?embed`} 
                            className="w-full h-full border-0 rounded-xl"
                            allowFullScreen
                          />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-slate-50/50"></div>
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
                                {activeSection === 'receipts' ? <FileText className="h-16 w-16 text-indigo-300" /> : <Share2 className="h-16 w-16 text-indigo-300" />}
                              </div>
                              <h4 className="text-2xl font-black text-slate-700 mb-3">Canva Autofill Embed</h4>
                              <p className="text-slate-500 text-center max-w-md text-lg">
                                The Canva editor will load here, automatically injecting the {activeSection === 'receipts' ? 'receipt' : 'certificate'} data into your template.
                              </p>
                            </div>
                          </>
                        )}
                     </div>
                   </div>
                 )}
              </div>
           )}

           {/* DOWNLOADS SECTION */}
           {activeSection === 'downloads' && (
              <div className="max-w-6xl mx-auto flex flex-col">
                 
                 {/* Top Tabs */}
                 <div className="flex gap-4 mb-8">
                   <button
                     onClick={() => setDownloadTab('meta')}
                     className={`px-8 py-3 rounded-full text-sm font-black transition-all ${downloadTab === 'meta' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                   >
                     Meta Work
                   </button>
                   <button
                     onClick={() => setDownloadTab('receipts')}
                     className={`px-8 py-3 rounded-full text-sm font-black transition-all ${downloadTab === 'receipts' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                   >
                     Receipts
                   </button>
                   <button
                     onClick={() => setDownloadTab('certificate')}
                     className={`px-8 py-3 rounded-full text-sm font-black transition-all ${downloadTab === 'certificate' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                   >
                     Certificates
                   </button>
                 </div>

                 {/* Meta Ad Studio Area */}
                 {downloadTab === 'meta' && (
                   <div className="flex flex-col gap-12 w-full pb-12 items-center justify-center pt-8">
                     <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-8 w-full max-w-3xl">
                        <div className="flex flex-col gap-6 w-full">
                           
                           <div>
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-slate-700 block">Languages</h4>
                                <button onClick={handleAddLanguage} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors" title="Add Language">
                                  <Plus size={18} />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {metaLanguagesList.map(lang => (
                                  <div 
                                    key={lang} 
                                    className={`group flex items-center justify-between px-4 py-2 rounded-xl cursor-pointer transition-colors ${metaLanguage === lang ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium border border-slate-200'}`} 
                                    onClick={() => setMetaLanguage(lang)}
                                  >
                                    <span>{lang}</span>
                                    {metaLanguagesList.length > 1 && (
                                      <div className="flex items-center ml-3 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleEditLanguage(lang); }} 
                                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 p-1 rounded mr-1"
                                          title="Edit Language"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteLanguage(lang); }} 
                                          className="text-slate-400 hover:text-red-600 hover:bg-red-100 p-1 rounded"
                                          title="Delete Language"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                           </div>
                           <div>
                             <label className="text-sm font-bold text-slate-700 mb-2 block">What is the ad about?</label>
                             <textarea 
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                               placeholder={`e.g., A 3-day Swar Yoga workshop focusing on stress relief. Target audience is stressed professionals. (Will generate in ${metaLanguage})`}
                               value={metaPrompt}
                               onChange={e => setMetaPrompt(e.target.value)}
                             />
                           </div>
                           
                           <div>
                             <label className="text-sm font-bold text-slate-700 mb-2 block">Canva Ad Template ID for {metaPlatform}</label>
                             <input 
                               type="text" 
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                               value={metaTemplatesMap[metaPlatform] || ''}
                               onChange={e => handleUpdateTemplate(e.target.value)}
                               placeholder={`Enter Template ID for ${metaPlatform}`}
                             />
                             <p className="text-xs text-slate-500 mt-2">
                               Make sure your Canva template has text placeholders named <code className="bg-slate-100 px-1 py-0.5 rounded">Headline</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">Subheading</code>, and <code className="bg-slate-100 px-1 py-0.5 rounded">CTA</code>.
                             </p>
                           </div>
                           
                           <button 
                             onClick={handleGenerateMetaAI}
                             disabled={isGeneratingMeta}
                             className={`mt-4 w-full py-4 rounded-xl font-black text-white text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 ${isGeneratingMeta ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'}`}
                           >
                             {isGeneratingMeta ? (
                               <>
                                 <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                 Generating {metaPlatform} Ad in {metaLanguage}...
                               </>
                             ) : (
                               <>
                                 ✨ Generate AI Ad & Open in Canva
                               </>
                             )}
                           </button>

                           {/* Generated Image Preview & Saved Ads */}
                           {(generatedAiImage || savedMetaAds.length > 0) && (
                             <div className="mt-8 pt-8 border-t border-slate-200">
                               {generatedAiImage && (
                                 <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                   <h4 className="font-bold text-indigo-800 mb-4 text-center">Just Generated</h4>
                                   <div className="rounded-xl overflow-hidden shadow-sm">
                                     <img src={generatedAiImage} alt="Generated AI Preview" className="w-full h-auto object-contain bg-white" />
                                   </div>
                                   {generatedAiText?.Headline && (
                                     <p className="mt-4 text-center font-bold text-indigo-900">"{generatedAiText.Headline}"</p>
                                   )}
                                   {generatedDesignId && (
                                     <a 
                                       href={`https://www.canva.com/design/${generatedDesignId}/edit`} 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       className="mt-4 block w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-center hover:bg-indigo-700 transition-colors shadow-md"
                                     >
                                       Edit Current Ad in Canva
                                     </a>
                                   )}
                                 </div>
                               )}
                               
                               {savedMetaAds.length > 0 && (
                                 <div>
                                   <h4 className="font-bold text-slate-700 mb-4 text-center">Previous Ads</h4>
                                   <div className="flex flex-col gap-4">
                                     {savedMetaAds.map(ad => (
                                       <div key={ad.id} className="border border-slate-200 rounded-xl p-4 flex gap-4 bg-slate-50 items-center">
                                         {ad.imageUrl && (
                                           <div className="w-32 h-auto flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                             <img src={ad.imageUrl} alt="Past Ad Preview" className="w-full h-full object-cover" />
                                           </div>
                                         )}
                                         <div className="flex-1">
                                           <div className="flex items-center gap-2 mb-1">
                                             <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{ad.platform}</span>
                                             <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{ad.language}</span>
                                           </div>
                                           {ad.text?.Headline && <p className="font-bold text-slate-800 text-sm mb-2 leading-tight">"{ad.text.Headline}"</p>}
                                           <a 
                                             href={`https://www.canva.com/design/${ad.designId}/edit`} 
                                             target="_blank" 
                                             rel="noopener noreferrer"
                                             className="inline-block bg-white border border-slate-200 text-slate-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                                           >
                                             Open in Canva
                                           </a>
                                         </div>
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </div>
                           )}
                        </div>
                     </div>
                   </div>
                 )}

                 {/* Batch List Area */}
                 {downloadTab !== 'meta' && (
                 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col mb-12 overflow-hidden">
                    
                    {/* Header Controls */}
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <h3 className="font-black text-slate-800 text-lg">
                           {selectedBatchForDownload ? `${selectedBatchForDownload} Downloads` : 'Select a Batch'}
                         </h3>
                         {leadsInSelectedBatch.length > 0 && (
                           <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                             {leadsInSelectedBatch.length} Leads
                           </span>
                         )}
                       </div>
                       
                       <div className="flex items-center gap-3">
                         <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-9">
                           <span className="px-3 text-xs font-bold text-slate-500 bg-slate-50 border-r border-slate-200 h-full flex items-center">Format</span>
                           <select 
                             className="text-sm font-bold text-slate-700 bg-white px-3 py-1 outline-none h-full cursor-pointer hover:bg-slate-50 transition-colors"
                             defaultValue="png"
                           >
                             <option value="png">PNG</option>
                             <option value="jpg">JPG</option>
                             <option value="pdf">PDF</option>
                           </select>
                         </div>
                         <button 
                           onClick={handleSelectAllDownloads}
                           disabled={leadsInSelectedBatch.length === 0}
                           className="flex items-center gap-2 px-4 h-9 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                         >
                           <CheckSquare size={16} className={selectedForDownload.length === leadsInSelectedBatch.length && leadsInSelectedBatch.length > 0 ? "text-indigo-600" : "text-slate-400"} />
                           {selectedForDownload.length === leadsInSelectedBatch.length && leadsInSelectedBatch.length > 0 ? 'Deselect All' : 'Select All'}
                         </button>
                         <button 
                           disabled={selectedForDownload.length === 0}
                           className="flex items-center gap-2 px-6 h-9 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow-sm disabled:shadow-none"
                         >
                           <Download size={16} />
                           Download Selected ({selectedForDownload.length})
                         </button>
                       </div>
                    </div>
                    
                    {/* Leads List */}
                    <div className="bg-white p-2">
                       {leadsInSelectedBatch.length > 0 ? (
                         <div className="divide-y divide-slate-100">
                           {leadsInSelectedBatch.map((lead, i) => {
                             const isChecked = selectedForDownload.includes(lead.id || lead._id);
                             const crmData = crmOfferData[lead.id || lead._id] || {};
                             
                             return (
                               <div key={lead.id || lead._id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group rounded-xl">
                                 <div className="flex items-center gap-4">
                                   <input 
                                     type="checkbox"
                                     checked={isChecked}
                                     onChange={() => toggleDownloadSelection(lead.id || lead._id)}
                                     className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                   />
                                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                                     {i+1}
                                   </div>
                                   <div>
                                     <div className="font-bold text-slate-800">{lead.name || lead.Name || 'Unknown'}</div>
                                     <div className="text-xs text-slate-500 flex gap-3 mt-1">
                                       <span>{lead.whatsapp || lead.mobile || 'No phone'}</span>
                                       {downloadTab === 'receipts' && (
                                         <span className="text-emerald-600 font-bold">{crmData.amount || lead.amount || '₹1,500'}</span>
                                       )}
                                       {downloadTab === 'certificate' && (
                                         <span className="text-indigo-500">{(lead.language || 'EN').toUpperCase()}</span>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                                 <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
                                   <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-9">
                                     <select 
                                       className="text-xs font-bold text-slate-700 bg-slate-50 px-2 outline-none h-full cursor-pointer hover:bg-slate-100 transition-colors uppercase"
                                       defaultValue="png"
                                     >
                                       <option value="png">PNG</option>
                                       <option value="jpg">JPG</option>
                                       <option value="pdf">PDF</option>
                                     </select>
                                   </div>
                                   <button 
                                     onClick={() => {
                                       setSelectedLeadId(lead.id || lead._id);
                                       setActiveSection(downloadTab === 'certificate' ? 'certificate' : 'receipts');
                                     }}
                                     className="flex items-center gap-2 px-4 h-9 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-all"
                                   >
                                     <Eye size={16} />
                                     Preview
                                   </button>
                                   <button className="flex items-center gap-2 px-4 h-9 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-lg text-sm font-bold transition-all">
                                     <Download size={16} />
                                     Download
                                   </button>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <Folder size={48} className="mb-4 opacity-20" />
                           <p className="font-medium">Please select a batch from the sidebar.</p>
                         </div>
                       )}
                    </div>
                    
                 </div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
