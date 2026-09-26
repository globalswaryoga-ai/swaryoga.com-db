filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# ADD STATE
state_str = "const [activeTab, setActiveTab] = useState<'forms'|'details'|'leads'|'closing'|'templates'>('forms');"
new_state_str = state_str + "\n  const [selectedDashboardLang, setSelectedDashboardLang] = useState<string>('English');"
content = content.replace(state_str, new_state_str)

# UPDATE SIDEBAR
sidebar_start = '<div className="flex-1 overflow-y-auto p-3">'
sidebar_end = '        </div>\n      </aside>\n\n      {/* Main Content Area */}'
start_idx = content.find(sidebar_start)
end_idx = content.find(sidebar_end)

if start_idx != -1 and end_idx != -1:
    new_sidebar = """<div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'forms' ? (
            <div className="space-y-2">
              {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Languages</div>}
              {['Marathi', 'Hindi', 'English', 'Kannada'].map(lang => (
                <div 
                  key={lang}
                  onClick={() => {
                    setSelectedDashboardLang(lang);
                    setSelectedWorkshop(null); // Clear selected batch so we see master dashboard
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center ${
                    selectedDashboardLang === lang && !selectedWorkshop
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20' 
                      : 'border-transparent hover:border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  {isSidebarCollapsed ? (
                    <div className="w-10 h-10 flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold rounded-lg text-lg">
                      {lang.charAt(0)}
                    </div>
                  ) : (
                    <h3 className={`font-bold text-sm ${selectedDashboardLang === lang && !selectedWorkshop ? 'text-indigo-900' : 'text-slate-800'}`}>{lang}</h3>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {Array.from(new Set(workshops.map(w => w.language || 'English'))).map(lang => (
                <div key={lang} className="mb-4 space-y-2">
                  {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">{lang} Batches</div>}
                  {workshops.filter(w => (w.language || 'English') === lang).map((w) => (
                    <div 
                      key={w.id}
                      onClick={() => {
                        setSelectedWorkshop(w);
                        toast.success(`Selected ${w.name}`);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all relative group flex items-center ${
                        selectedWorkshop?.id === w.id 
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20' 
                          : 'border-transparent hover:border-slate-200 bg-white hover:bg-slate-50'
                      } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                      title={isSidebarCollapsed ? w.name : undefined}
                    >
                      {isSidebarCollapsed ? (
                        <div className="w-10 h-10 flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold rounded-lg text-lg">
                          {w.name.charAt(0)}
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 pr-12">
                            <h3 className={`font-bold text-sm mb-1 line-clamp-1 ${selectedWorkshop?.id === w.id ? 'text-indigo-900' : 'text-slate-800'}`}>{w.name}</h3>
                            <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                              <Users size={12}/> {w.leads} Leads
                            </p>
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/90 p-1 rounded-lg border border-slate-100 shadow-sm">
                            <button 
                              onClick={(e) => handleEditBatch(e, w)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteBatch(e, w.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
"""
    content = content[:start_idx] + new_sidebar + content[end_idx:]

with open(filepath, 'w') as f:
    f.write(content)
