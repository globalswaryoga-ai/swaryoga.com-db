const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove const SIDEBAR_TABS array and replace it with default tabs const
content = content.replace(/const SIDEBAR_TABS = \[[\s\S]*?\];/, `const DEFAULT_SIDEBAR_TABS = [
  { id: 'new_leads', label: 'New Leads', icon: FileText, isSystem: true },
  { id: 'pending_leads', label: 'Pending Leads', icon: Clock, isSystem: true },
  { id: 'pending_leads_1', label: 'Pending Leads-1', icon: Clock, isSystem: true },
  { id: 'pending_leads_2', label: 'Pending Leads-2', icon: Clock, isSystem: true },
  { id: 'pending_leads_3', label: 'Pending Leads-3', icon: Clock, isSystem: true },
  { id: 'approval_1', label: 'Aprovel-1', icon: CheckCircle, isSystem: true },
  { id: 'approval_2', label: 'Aprovel-2', icon: CheckCircle, isSystem: true },
  { id: 'registered_leads', label: 'Registerd leads', icon: UserCheck, isSystem: true },
  { id: 'set_zoom_meeting', label: 'Set zoom meeting', icon: Calendar, isSystem: true },
  { id: 'take_zoom_meeting', label: 'Take Zoom Meeting', icon: Video, isSystem: true },
  { id: 'rejected_leads', label: 'Rejected leads', icon: XCircle, isSystem: true },
  { id: 'ai_triggers', label: 'AI Triggers-WT', icon: Zap, isSystem: true },
];`);

const stateInjection = `
  const [customCategories, setCustomCategories] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_custom_categories');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  
  const SIDEBAR_TABS = React.useMemo(() => [...DEFAULT_SIDEBAR_TABS, ...customCategories], [customCategories]);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
`;
content = content.replace('const [selectedLeads, setSelectedLeads] = useState<string[]>([]);', `const [selectedLeads, setSelectedLeads] = useState<string[]>([]);\n${stateInjection}`);

const customUI = `
  // Category Management Methods
  const saveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const label = formData.get('label') as string;
    const aiAssign = formData.get('aiAssign') as string;
    
    let newCats = [...customCategories];
    if (editingCategory?.id) {
      newCats = newCats.map(c => c.id === editingCategory.id ? { ...c, label, aiAssignment: aiAssign } : c);
    } else {
      newCats.push({
        id: 'custom_' + Date.now(),
        label,
        icon: Clock,
        isSystem: false,
        aiAssignment: aiAssign
      });
    }
    setCustomCategories(newCats);
    if (typeof window !== 'undefined') localStorage.setItem('crm_custom_categories', JSON.stringify(newCats));
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    toast.success('Category saved!');
  };

  const deleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this category?')) return;
    const newCats = customCategories.filter(c => c.id !== id);
    setCustomCategories(newCats);
    if (typeof window !== 'undefined') localStorage.setItem('crm_custom_categories', JSON.stringify(newCats));
    if (activeTab === id) setActiveTab('new_leads');
  };

  // Render the Category Modal
  const renderCategoryModal = () => {
    if (!isCategoryModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={saveCategory} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
              <input type="text" name="label" defaultValue={editingCategory?.label} required className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign AI (Optional)</label>
              <select name="aiAssign" defaultValue={editingCategory?.aiAssignment || ''} className="w-full p-2 border rounded-lg">
                <option value="">None</option>
                <option value="AI-4A">AI-4A</option>
                <option value="AI-4B">AI-4B</option>
                <option value="AI-4C">AI-4C</option>
                <option value="AI-4D">AI-4D</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  };
`;

content = content.replace('return (\n    <div className="flex flex-col h-full bg-slate-50 w-full animate-fade-in relative">', customUI + '\n  return (\n    <div className="flex flex-col h-full bg-slate-50 w-full animate-fade-in relative">');

// Update the Sidebar to render custom categories
const sidebarReplacement = `
            {/* Sidebar Categories */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider px-3">Categories</h3>
                <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-gray-200 rounded text-gray-600">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {SIDEBAR_TABS.map(tab => {
                const TabIcon = tab.icon || Clock;
                const isSystem = tab.isSystem;
                const isCustom = !isSystem;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={\`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }\`}
                  >
                    <div className="flex items-center gap-3">
                      <TabIcon className={\`h-4 w-4 \${activeTab === tab.id ? 'text-indigo-200' : 'text-gray-400'}\`} />
                      {tab.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={\`text-xs px-2 py-0.5 rounded-full \${
                        activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'
                      }\`}>
                        {tabCounts[tab.id] || 0}
                      </span>
                      {isCustom && activeTab === tab.id && (
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingCategory(tab); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-indigo-700 rounded text-white">
                            <Plus className="h-3 w-3" />
                          </button>
                          <button onClick={(e) => deleteCategory(tab.id, e)} className="p-1 hover:bg-indigo-700 rounded text-red-200">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
`;

content = content.replace(/<div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">[\s\S]*?(?=<div className="p-4 border-t border-gray-200 bg-white">)/, sidebarReplacement);

// Render Category Modal
content = content.replace('{activeModal && (', '{renderCategoryModal()}\n      {activeModal && (');

// Apply new AI Modal
const newModalUI = `
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                🤖 {activeModal} Configuration
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
              
              {modalConditions.map((condition, idx) => (
                <div key={idx} className="space-y-4 border border-slate-200 rounded-xl p-5 bg-white shadow-sm relative">
                  {/* Row 1: Question Key */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Question Key (or column name)</label>
                    <select
                      value={condition.question || ''}
                      onChange={(e) => {
                        const updated = [...modalConditions];
                        updated[idx].question = e.target.value;
                        setModalConditions(updated);
                      }}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white"
                    >
                      <option value="">-- Search across all questions --</option>
                      {availableQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>

                  {/* Row 2: Success Match */}
                  <div className="p-3 rounded-lg border flex items-center gap-3" style={{ backgroundColor: condition.successColor || '#e6ffed' }}>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">If Correct Answer Matches:</label>
                      <input
                        type="text"
                        placeholder="Keyword(s)"
                        value={condition.keyword || ''}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].keyword = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Move to Category:</label>
                      <select
                        value={condition.successCategory || ''}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].successCategory = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none bg-white"
                      >
                        <option value="">-- Select --</option>
                        {SIDEBAR_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Color</label>
                      <input 
                        type="color" 
                        value={condition.successColor || '#e6ffed'}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].successColor = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="h-8 w-12 cursor-pointer rounded border"
                      />
                    </div>
                  </div>

                  {/* Row 3: Failure Mismatch */}
                  <div className="p-3 rounded-lg border flex items-center gap-3" style={{ backgroundColor: condition.failColor || '#fff3cd' }}>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">If Answer Mismatches, Move to:</label>
                      <select
                        value={condition.failCategory || ''}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].failCategory = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none bg-white"
                      >
                        <option value="">-- Select --</option>
                        {SIDEBAR_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Color</label>
                      <input 
                        type="color" 
                        value={condition.failColor || '#fff3cd'}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].failColor = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="h-8 w-12 cursor-pointer rounded border"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => setModalConditions([...modalConditions, { question: '', keyword: '' }])}
                className="w-full border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                + Add Another Filter
              </button>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => saveAiFilter(activeModal, modalConditions)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                Submit Config & Run
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(/\{activeModal && \([\s\S]*?(?=\{\s*selectedQueryLeadId && \()/m, newModalUI + '\n\n');

fs.writeFileSync(file, content);
console.log("Successfully rebuilt LeadsManagementTab UI");
