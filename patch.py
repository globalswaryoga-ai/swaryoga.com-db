import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# 1. Update activeTab state
content = content.replace(
    '''  const [activeTab, setActiveTab] = useState<
    "forms" | "details" | "leads" | "closing" | "templates"
  >("forms");''',
    '''  const [activeTab, setActiveTab] = useState<
    "all_leads" | "forms" | "details" | "leads" | "closing" | "templates" | "my_data"
  >("all_leads");'''
)

# 2. Update activeSource and add isManualFormId
content = content.replace(
    '  const [activeSource, setActiveSource] = useState<"crm" | "google">("crm");',
    '  const [activeSource, setActiveSource] = useState<"crm" | "google">("crm");\n  const [isManualFormId, setIsManualFormId] = useState(false);'
)

# 3. Update TopTabs
content = content.replace(
    '''  const TopTabs = [
    { id: 'details', label: 'Workshop Details', icon: Calendar },
    { id: 'forms', label: 'Workshop Forms', icon: FileText },
    { id: 'leads', label: 'Leads Management', icon: Users },
    { id: 'closing', label: 'Leads Closing', icon: Handshake },
    { id: 'templates', label: 'Message Templates', icon: MessageSquare },
  ] as const;''',
    '''  const TopTabs = [
    { id: "all_leads", label: "All Leads Data", icon: Users },
    { id: "my_data", label: "My Data", icon: Database },
    { id: 'details', label: 'Workshop Details', icon: Calendar },
    { id: 'forms', label: 'Workshop Forms', icon: FileText },
    { id: 'leads', label: 'Leads Management', icon: Users },
    { id: 'closing', label: 'Leads Closing', icon: Handshake },
    { id: 'templates', label: 'Message Templates', icon: MessageSquare },
  ] as const;'''
)

# 4. Update canAccessTab
content = content.replace(
    '''  const canAccessTab = (tabId: string) => {
    return !!selectedWorkshop;
  };''',
    '''  const canAccessTab = (tabId: string) => {
    if (tabId === "all_leads" || tabId === "my_data") return true;
    return !!selectedWorkshop;
  };'''
)

# 5. SaveWorkshopSettings
content = content.replace(
    '''  const saveWorkshopSettings = async () => {
    if (!selectedWorkshop) return;''',
    '''  const saveWorkshopSettings = async () => {
    const targetWorkshop = selectedWorkshop || workshops.find(w => (w.language || "English").toLowerCase() === selectedDashboardLang.toLowerCase());
    if (!targetWorkshop) {
      toast.error("No batch available to save settings to.");
      return;
    }'''
)
content = content.replace(
    '''          cohortId: selectedWorkshop.id,
          googleFormLink: googleFormUrl,
          metadata: {
            ...selectedWorkshop.metadata,''',
    '''          cohortId: targetWorkshop.id,
          googleFormLink: googleFormUrl,
          metadata: {
            ...targetWorkshop.metadata,'''
)

# 6. Sidebar clicks
content = content.replace(
    '''                  onClick={() => {
                    setSelectedDashboardLang(lang);
                    setSelectedWorkshop(null); // Clear selected batch so we see master dashboard
                  }}''',
    '''                  onClick={() => {
                    setSelectedDashboardLang(lang);
                    setSelectedWorkshop(null); // Clear selected batch so we see master dashboard
                    setActiveTab("all_leads");
                  }}'''
)
content = content.replace(
    '''                    onClick={() => {
                      setSelectedWorkshop(w);
                      toast.success(`Selected ${w.name}`);
                    }}''',
    '''                    onClick={() => {
                      setSelectedWorkshop(w);
                      setActiveTab("my_data");
                      toast.success(`Selected ${w.name}`);
                    }}'''
)

# 7. TopTabs render
content = content.replace(
    '''            {TopTabs.map((tab) => {
              let count: number | null = null;''',
    '''            {TopTabs.map((tab) => {
              if (!selectedWorkshop && tab.id !== "all_leads" && tab.id !== "my_data") return null;
              let count: number | null = null;'''
)
content = content.replace(
    '''                <button
                  key={tab.id}
                  disabled={!canAccessTab(tab.id)}
                  onClick={() => setActiveTab(tab.id as any)}''',
    '''                <button
                  key={tab.id}
                  disabled={!canAccessTab(tab.id)}
                  onClick={() => {
                    if (tab.id === "all_leads") setSelectedWorkshop(null);
                    setActiveTab(tab.id as any);
                  }}'''
)

# 8. Manual form input
content = content.replace(
    '''                      <div className="mt-5 pt-4 border-t border-slate-200/60">
                        {activeSource === "google" && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Auto-syncing every 5 minutes
                          </div>
                        )}
                      </div>''',
    '''                      <div className="mt-5 pt-4 border-t border-slate-200/60">
                        {activeSource === "google" && (
                          <>
                            <button 
                              onClick={() => setIsManualFormId(!isManualFormId)}
                              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors mb-3"
                            >
                              {isManualFormId ? <ChevronDown size={16} /> : <ChevronRight size={16} />} 
                              {isManualFormId ? "Hide manual input (use dropdown)" : "Or enter Form ID manually"}
                            </button>
                            {isManualFormId && (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Paste Google Form Edit URL here..."
                                  value={googleFormUrl}
                                  onChange={(e) => setGoogleFormUrl(e.target.value)}
                                  className="flex-1 text-sm border-slate-200 rounded-lg focus:ring-indigo-500 outline-none px-3 py-2 border bg-white"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>'''
)
content = content.replace(
    '''                            <select
                              value={googleFormUrl}
                              onChange={(e) => setGoogleFormUrl(e.target.value)}
                              className="flex-1 text-sm border-slate-200 rounded-lg focus:ring-indigo-500 outline-none px-3 py-2 border bg-white shadow-inner font-medium text-slate-700"
                            >''',
    '''                            <select
                              value={googleFormUrl}
                              onChange={(e) => setGoogleFormUrl(e.target.value)}
                              disabled={isManualFormId}
                              className={`flex-1 text-sm border-slate-200 rounded-lg focus:ring-indigo-500 outline-none px-3 py-2 border bg-white shadow-inner font-medium text-slate-700 ${isManualFormId ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >'''
)

# 9. Master Dashboard
no_batch_block = '''          {!selectedWorkshop ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="bg-slate-100 p-6 rounded-full mb-6 text-slate-300">
                  <Handshake size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-600 mb-2">No Batch Selected</h3>
                <p className="text-sm font-medium text-slate-500 max-w-sm text-center">
                  Please select a batch from the sidebar or create a new one to access the workspace.
                </p>
             </div>
          ) : (
            <>'''

master_dashboard_block = '''          {!selectedWorkshop && activeTab === "all_leads" && (
            <div className="flex-1 min-w-0 overflow-y-auto space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <div className="mb-6 flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        {selectedDashboardLang} Dashboard
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        View active batches for this language.
                      </p>
                    </div>
                  </div>
                  
                  {/* Grid of Batch Cards */}
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Active Batches</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {workshops
                      .filter((w) => (w.language || "English").toLowerCase() === selectedDashboardLang.toLowerCase())
                      .map((w) => (
                        <div key={w.id} onClick={() => { setSelectedWorkshop(w); setActiveTab("my_data"); }} className="border p-6 rounded-xl cursor-pointer hover:shadow-lg transition-all bg-white group">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{w.name}</h3>
                            <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                              {w.leads || 0} Leads
                            </div>
                          </div>
                          <div className="text-sm text-slate-500 space-y-1">
                            <p><strong>Start:</strong> {w.startDate ? new Date(w.startDate).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Duration:</strong> {w.duration || 'N/A'}</p>
                          </div>
                        </div>
                      ))}
                    {workshops.filter((w) => (w.language || "English").toLowerCase() === selectedDashboardLang.toLowerCase()).length === 0 && (
                      <div className="col-span-full text-center py-8 text-slate-500">No batches found for this language.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!selectedWorkshop && activeTab === "all_leads") || (selectedWorkshop && activeTab === "forms") ? (
            <>'''

content = content.replace(no_batch_block, master_dashboard_block)

content = content.replace(
    '''              {/* TAB 1: Workshop Details */}\n              {activeTab === 'details' && (''',
    '''            </>\n          ) : null}\n          {selectedWorkshop ? (\n            <>\n              {/* TAB 1: Workshop Details */}\n              {activeTab === 'details' && ('''
)

content = content.replace(
    '''              {/* TAB 2: Google Form Setup */}\n              {activeTab === 'forms' && (''',
    '''              {/* TAB 2: Google Form Setup */}'''
)

# 10. Table for My Data
content = content.replace(
    '''              {/* TAB 3: Leads Management */}\n              {activeTab === 'leads' && (''',
    '''              {/* My Data Tab */}\n              {activeTab === 'my_data' && ('''
)

content = content.replace(
    '''              {/* TAB 3: Leads Management */}\n              {activeTab === 'my_data' && (''',
    '''              {/* My Data Tab */}\n              {activeTab === 'my_data' && ('''
)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
