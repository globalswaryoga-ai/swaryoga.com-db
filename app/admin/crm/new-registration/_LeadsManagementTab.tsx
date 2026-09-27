import React, { useState } from 'react';
import { FileText, Clock, CheckCircle, UserCheck, Users } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';

const SIDEBAR_TABS = [
  { id: 'new_leads', label: 'New Leads', icon: FileText },
  { id: 'pending_leads', label: 'Pending Leads', icon: Clock },
  { id: 'pending_leads_1', label: 'Pending Leads-1', icon: Clock },
  { id: 'pending_leads_2', label: 'Pending Leads-2', icon: Clock },
  { id: 'pending_leads_3', label: 'Pending Leads-3', icon: Clock },
  { id: 'approval_1', label: 'Aprovel-1', icon: CheckCircle },
  { id: 'approval_2', label: 'Aprovel-2', icon: CheckCircle },
  { id: 'registered_leads', label: 'Registerd leads', icon: UserCheck },
];

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Kannada'];

export function LeadsManagementTab({ 
  workshops,
  selectedDashboardLang = 'English',
  selectedWorkshop = null
}: { 
  workshops: any[];
  selectedDashboardLang?: string;
  selectedWorkshop?: any;
}) {
  const toast = useToast();
  
  const [selectedLanguage, setSelectedLanguage] = useState(selectedDashboardLang);
  const [selectedBatchId, setSelectedBatchId] = useState(selectedWorkshop?.id?.startsWith('batch_') ? selectedWorkshop.id : '');
  const [activeBatchId, setActiveBatchId] = useState('');
  const [activeTab, setActiveTab] = useState('new_leads');

  // Filter batches by language to populate the dropdown
  const filteredBatches = (workshops || []).filter(
    (w) => w.id.startsWith('batch_') && (w.language || 'English').toLowerCase() === selectedLanguage.toLowerCase()
  );

  const handleSubmit = () => {
    if (!selectedBatchId) {
      toast.error('Please select a batch first');
      return;
    }
    setActiveBatchId(selectedBatchId);
    toast.success('Batch selected. Ready to load leads...');
  };

  const activeBatchName = workshops?.find(w => w.id === activeBatchId)?.name || '';

  return (
    <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-140px)] animate-fade-in">
      
      {/* Sidebar Section */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-10 flex-shrink-0">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-black text-slate-900 text-lg">
            Categories
          </h2>
        </div>
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          {SIDEBAR_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2.5 transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
              {tab.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Section */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-600" size={24} />
            Leads Management
          </h2>
          
          <div className="flex items-center gap-3">
            <select
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setSelectedBatchId('');
              }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            <select
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-48 truncate"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              <option value="">-- Select Batch Name --</option>
              {filteredBatches.map(batch => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>

            <button
              onClick={handleSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              Submit
            </button>
          </div>
        </header>

        {/* Working Area Section */}
        <main className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
          {activeBatchId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {SIDEBAR_TABS.find(t => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Showing batch-wise private data for: <strong className="text-slate-700">{activeBatchName}</strong>
                  </p>
                </div>
              </div>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-500">Name</th>
                      <th className="px-4 py-3 font-bold text-slate-500">WhatsApp</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Language</th>
                      <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users size={32} className="text-slate-300" />
                          <p>Logic for displaying and managing {SIDEBAR_TABS.find(t => t.id === activeTab)?.label} leads goes here.</p>
                          <p className="text-xs text-slate-400">Data is completely private to this batch and will not mix with others.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-3">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-2">
                <FileText size={24} className="text-slate-300" />
              </div>
              <p className="font-medium text-slate-500 text-lg">No batch selected</p>
              <p className="text-sm">Please select a language and batch name from the header, then click Submit.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
