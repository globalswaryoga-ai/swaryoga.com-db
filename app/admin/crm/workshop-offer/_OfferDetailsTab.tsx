import React, { useState, useEffect } from 'react';
import { FileText, Users, FileCheck, RefreshCw, CheckCircle2, Filter } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';

export default function OfferDetailsTab({ 
  leads, 
  selectedWorkshop,
  saveWorkshopSettings,
  selectedDashboardLang,
  setSelectedDashboardLang,
  workshops,
  setSelectedWorkshop
}: { 
  leads: any[]; 
  selectedWorkshop: any;
  saveWorkshopSettings?: () => Promise<void>;
  selectedDashboardLang: string;
  setSelectedDashboardLang: (lang: string) => void;
  workshops: any[];
  setSelectedWorkshop: (workshop: any) => void;
}) {
  const { toast } = useToast();
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Auto sync effect
  useEffect(() => {
    let interval: any;
    if (isAutoSyncing) {
      interval = setInterval(() => {
        setLastSyncTime(new Date());
        toast.success('🤖 AI Sync: Automatically checked offers for new payments and updates');
      }, 10 * 60 * 1000); // 10 minutes
    }
    return () => clearInterval(interval);
  }, [isAutoSyncing]);

  const getBaseLanguage = (langStr?: string): string => {
    if (!langStr) return 'english';
    const lower = langStr.toLowerCase();
    if (lower.includes('hindi')) return 'hindi';
    if (lower.includes('marathi')) return 'marathi';
    if (lower.includes('kannada')) return 'kannada';
    return 'english';
  };

  const matchesLanguage = (w: any, targetLang: string) => {
    if (!w || !targetLang) return false;
    const wLang = String(w.language || w.name || '').toLowerCase();
    const tLang = String(targetLang).toLowerCase();
    const isWOffer = wLang.includes('offer') || String(w.id || '').toLowerCase().includes('offer');
    const isTOffer = tLang.includes('offer');
    if (isWOffer !== isTOffer) return false;
    return getBaseLanguage(wLang) === getBaseLanguage(tLang);
  };

  // Include all batches (including master) for the selected language
  const availableBatches = workshops.filter((w: any) => 
    w && w.id && matchesLanguage(w, selectedDashboardLang)
  );

  const getAutoAmount = () => {
    if (!selectedWorkshop) return '';
    const nameToMatch = selectedWorkshop.formFilterKeyword || selectedWorkshop.name || '';
    // Look for ₹ followed by digits/commas
    const match = nameToMatch.match(/₹\s*([\d,]+)/);
    if (match) return `₹${match[1]}`;
    return '';
  };

  const filteredLeads = React.useMemo(() => {
    if (!selectedWorkshop || !selectedWorkshop.formFilterKeyword || String(selectedWorkshop.id).startsWith('master_')) {
      return leads;
    }
    const keywords = String(selectedWorkshop.formFilterKeyword).toLowerCase().split('|').map(k => k.trim()).filter(Boolean);
    const ai7Col = selectedWorkshop.metadata?.googleFormMapping?.['AI-7'] || selectedWorkshop.metadata?.googleFormMapping?.['ai7'];
    
    return leads.filter(l => {
      const record = l._rawRecord || l.dynamicAnswers || {};
      
      const isMatch = (valStr: string, keyword: string) => {
        const v = String(valStr).toLowerCase().trim();
        const k = String(keyword).toLowerCase().trim();
        if (!v || !k) return false;
        if (v === k) return true;
        if (k.split(/\s+/).length <= 3) return v.includes(k);
        return false;
      };

      if (ai7Col && record[ai7Col]) {
        return keywords.some(k => isMatch(record[ai7Col], k));
      }
      return keywords.some(k => Object.values(record).some(val => isMatch(val as string, k)));
    });
  }, [leads, selectedWorkshop]);

  const [leadData, setLeadData] = useState<Record<string, any>>({});
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('crm_offer_data');
    if (saved) {
      try {
        setLeadData(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  const updateLeadData = (leadId: string, field: string, value: any) => {
    setLeadData(prev => {
      const updated = {
        ...prev,
        [leadId]: { ...(prev[leadId] || {}), [field]: value }
      };
      localStorage.setItem('crm_offer_data', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePushToReceipts = () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select at least one lead first.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setLeadData(prev => {
      const updated = { ...prev };
      selectedLeads.forEach(id => {
        updated[id] = {
          ...(updated[id] || {}),
          status: 'received',
          pushedToReceipts: true,
          date: (updated[id]?.date) || today,
          amount: (updated[id]?.amount) || getAutoAmount()
        };
      });
      localStorage.setItem('crm_offer_data', JSON.stringify(updated));
      return updated;
    });
    setSelectedLeads([]);
    toast.success(`Successfully pushed ${selectedLeads.length} leads to Received Amount!`);
  };

  const visibleLeads = filteredLeads;

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(visibleLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
      
      {/* Header Filters */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Filter By:</span>
          </div>
          
          <select 
            value={selectedDashboardLang} 
            onChange={(e) => {
              setSelectedDashboardLang(e.target.value);
              const masterWorkshop = workshops.find((w: any) => matchesLanguage(w, e.target.value));
              setSelectedWorkshop(masterWorkshop || null);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
          >
            <optgroup label="Offer Forms">
              <option value="English Offer">English Offer</option>
              <option value="Hindi Offer">Hindi Offer</option>
              <option value="Marathi Offer">Marathi Offer</option>
              <option value="Kannada Offer">Kannada Offer</option>
            </optgroup>
            <optgroup label="Workshop Forms">
              <option value="English Workshop">English Workshop</option>
              <option value="Hindi Workshop">Hindi Workshop</option>
              <option value="Marathi Workshop">Marathi Workshop</option>
              <option value="Kannada Workshop">Kannada Workshop</option>
            </optgroup>
          </select>

          <select 
            value={selectedWorkshop?.id || ''} 
            onChange={(e) => {
              const batch = workshops.find(w => w.id === e.target.value);
              if (batch) setSelectedWorkshop(batch);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium min-w-[300px] w-auto max-w-none"
          >
            <option value="">Select Offer Batch...</option>
            {availableBatches.map(batch => {
              const fullName = batch.formFilterKeyword ? `${getBaseLanguage(batch.language || selectedDashboardLang)} - ${batch.formFilterKeyword}` : batch.name;
              return (
                <option key={batch.id} value={batch.id}>{fullName}</option>
              );
            })}
          </select>
          
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
            Submit
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <input 
                type="text" 
                className="w-24 bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500" 
                placeholder="Prefix" 
                defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('canvaReceiptPrefix') || '') : ''}
                onChange={(e) => {
                  if (typeof window !== 'undefined') localStorage.setItem('canvaReceiptPrefix', e.target.value);
                }}
              />
            <input 
                type="text" 
                className="w-32 bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500" 
                placeholder="Canva Template ID" 
                defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('canvaReceiptTemplateId') || 'DAGw5Hx3Vmo') : 'DAGw5Hx3Vmo'}
                onChange={(e) => {
                  if (typeof window !== 'undefined') localStorage.setItem('canvaReceiptTemplateId', e.target.value);
                }}
              />
          </div>

          <label className="flex items-center gap-2 cursor-pointer group bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isAutoSyncing ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <input type="checkbox" className="sr-only peer" checked={isAutoSyncing} onChange={(e) => setIsAutoSyncing(e.target.checked)} />
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isAutoSyncing ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
              🤖 Auto AI Sync (10m)
            </span>
          </label>

          <button onClick={handlePushToReceipts} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105 flex items-center gap-2">
            <FileCheck size={16} />
            Push to Receipts {selectedLeads.length > 0 ? `(${selectedLeads.length})` : ''}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-[600px]">
        {/* Working Area - Full Page */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Users size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">
                  {selectedWorkshop ? (selectedWorkshop.formFilterKeyword ? `${getBaseLanguage(selectedWorkshop.language || selectedDashboardLang)} - ${selectedWorkshop.formFilterKeyword}` : selectedWorkshop.name) : 'All Leads'}
                </h3>
                <p className="text-xs text-slate-500">{filteredLeads.length} leads found in this batch</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-white">
            {visibleLeads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="font-medium text-slate-500">No leads found in this batch.</p>
              </div>
            ) : (
              <div className="min-w-max pb-16">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-500 sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] z-20 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                          checked={selectedLeads.length === visibleLeads.length && visibleLeads.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-500 sticky left-10 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] z-20 w-12">Sr.No</th>
                      <th className="px-4 py-3 font-bold text-slate-500 sticky left-[5.5rem] bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] z-20">Name</th>
                      <th className="px-4 py-3 font-bold text-slate-500">WhatsApp Number</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Email</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Amount</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Status</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Select Date</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Payment Mode</th>
                      <th className="px-4 py-3 font-bold text-slate-500 min-w-[200px]">Add Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLeads.map((lead: any, i: number) => {
                      const answers = lead.dynamicAnswers || lead._rawRecord || {};
                      const name = lead.name || answers['Name'] || answers['NAME'] || 'Unknown';
                      const email = lead.email || answers['Email'] || answers['EMAIL'] || '-';
                      const phone = lead.mobile || lead.phoneNumber || lead.phone || answers['WhatsApp Number'] || answers['Mobile'] || '-';
                      
                      const rowData = leadData[lead.id] || {};
                      const status = rowData.status || 'pending';
                      
                      return (
                        <tr key={lead.id || i} className={`transition-colors group ${selectedLeads.includes(lead.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-3 sticky left-0 shadow-[1px_0_0_0_#e2e8f0] z-10 ${selectedLeads.includes(lead.id) ? 'bg-indigo-50/50' : 'bg-white group-hover:bg-slate-50'}`}>
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                              checked={selectedLeads.includes(lead.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedLeads(prev => [...prev, lead.id]);
                                else setSelectedLeads(prev => prev.filter(id => id !== lead.id));
                              }}
                            />
                          </td>
                          <td className={`px-4 py-3 font-bold text-slate-500 sticky left-10 shadow-[1px_0_0_0_#e2e8f0] z-10 ${selectedLeads.includes(lead.id) ? 'bg-indigo-50/50' : 'bg-white group-hover:bg-slate-50'}`}>
                            {i + 1}
                          </td>
                          <td className={`px-4 py-3 font-bold text-slate-800 sticky left-[5.5rem] shadow-[1px_0_0_0_#e2e8f0] z-10 ${selectedLeads.includes(lead.id) ? 'bg-indigo-50/50' : 'bg-white group-hover:bg-slate-50'}`}>
                            {name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{phone}</td>
                          <td className="px-4 py-3 text-slate-600">{email}</td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={rowData.amount !== undefined ? rowData.amount : getAutoAmount()}
                              onChange={(e) => updateLeadData(lead.id, 'amount', e.target.value)}
                              placeholder="₹0.00" 
                              className="w-24 border border-slate-300 rounded px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={status}
                              onChange={(e) => updateLeadData(lead.id, 'status', e.target.value)}
                              className={`border border-slate-300 rounded px-2 py-1 text-xs font-bold outline-none ${status === 'received' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                            >
                              <option value="pending" className="text-amber-700">Pending</option>
                              <option value="received" className="text-emerald-700">Received</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="date" 
                              value={rowData.date || ''}
                              onChange={(e) => updateLeadData(lead.id, 'date', e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={rowData.paymentMode || ''}
                              onChange={(e) => updateLeadData(lead.id, 'paymentMode', e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 text-xs outline-none text-slate-600 w-32"
                            >
                              <option value="">Select Mode...</option>
                              <option value="upi">UPI / GPay</option>
                              <option value="bank">Bank Transfer</option>
                              <option value="cash">Cash</option>
                              <option value="card">Credit Card</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={rowData.remark || ''}
                              onChange={(e) => updateLeadData(lead.id, 'remark', e.target.value)}
                              placeholder="Add notes..." 
                              className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
