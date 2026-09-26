filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# ══════════════════════════════════════════════
# CHANGE 1: Add all_data tab type + state
# ══════════════════════════════════════════════
content = content.replace(
    "const [activeTab, setActiveTab] = useState<'details'|'forms'|'leads'|'closing'|'templates'>('details');",
    "const [activeTab, setActiveTab] = useState<'all_data'|'details'|'forms'|'leads'|'closing'|'templates'>('all_data');\n  const [selectedDashboardLang, setSelectedDashboardLang] = useState<string>('English');"
)

# ══════════════════════════════════════════════
# CHANGE 2: Add all_data to TopTabs
# ══════════════════════════════════════════════
content = content.replace(
    "  const TopTabs = [\n    { id: 'details', label: 'Workshop Details', icon: Calendar },",
    "  const TopTabs = [\n    { id: 'all_data', label: 'Leads All Data', icon: Users },\n    { id: 'details', label: 'Workshop Details', icon: Calendar },"
)

# ══════════════════════════════════════════════
# CHANGE 3: canAccessTab - all_data always accessible
# ══════════════════════════════════════════════
content = content.replace(
    "  const canAccessTab = (tabId: string) => {\n    return !!selectedWorkshop;\n  };",
    "  const canAccessTab = (tabId: string) => {\n    if (tabId === 'all_data') return true;\n    return !!selectedWorkshop;\n  };"
)

# ══════════════════════════════════════════════
# CHANGE 4: Remove Workshop Registration Form from forms tab
# (keep only Linked Leads inside forms tab)
# ══════════════════════════════════════════════
old_forms_tab_header = """              {/* TAB 2: Workshop Forms */}
              {activeTab === 'forms' && (
                <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <button 
                      onClick={() => setIsFormSetupCollapsed(!isFormSetupCollapsed)}
                      className="w-full text-left px-6 py-4 border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Workshop Registration Form</h2>
                        <p className="text-sm text-slate-500">Connect a form to capture leads for this workshop.</p>
                      </div>
                      <div className="text-slate-400">
                        {isFormSetupCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>"""

new_forms_tab_header = """              {/* TAB 2: Workshop Forms */}
              {activeTab === 'forms' && (
                <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Workshop Forms - {leadsData.length}</h2>
                        <p className="text-sm text-slate-500">Leads captured from the connected form.</p>
                      </div>
                    </div>"""

if old_forms_tab_header in content:
    content = content.replace(old_forms_tab_header, new_forms_tab_header, 1)
    print("CHANGE 4 OK: forms tab header replaced")
else:
    print("WARN: forms tab header NOT found")

# ══════════════════════════════════════════════
# CHANGE 5: Remove isFormSetupCollapsed block from forms tab
# The form content block starts with:
#                     
#                     {!isFormSetupCollapsed && (
#                       <>
# and ends just before:
#                     {/* Render Fetched Leads Inline in Forms Tab */}
# ══════════════════════════════════════════════
# Find the collapse block
start_marker = "\n                    \n                    {!isFormSetupCollapsed && ("
end_marker = "                    {/* Render Fetched Leads Inline in Forms Tab */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + "\n" + content[end_idx:]
    print(f"CHANGE 5 OK: removed form setup block ({end_idx - start_idx} chars)")
else:
    # Try alternate
    start_marker2 = "                    {!isFormSetupCollapsed && ("
    start_idx2 = content.find(start_marker2)
    print(f"WARN: markers not found. start_idx={start_idx}, end_idx={end_idx}")
    print(f"  alt start_idx2={start_idx2}")

# ══════════════════════════════════════════════
# CHANGE 6: Add all_data tab panel + language form setup
# Insert before: {activeTab !== 'all_data' && !selectedWorkshop ?
# ══════════════════════════════════════════════
all_data_panel = """          {/* TAB 0: Leads All Data */}
          {activeTab === 'all_data' && (
            <div className="flex gap-6 h-full overflow-hidden animate-fade-in">
              {/* Language Sidebar */}
              <div className="w-48 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 shrink-0 flex flex-col gap-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Languages</h3>
                {['Marathi', 'Hindi', 'English', 'Kannada'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedDashboardLang(lang)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${selectedDashboardLang === lang ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${selectedDashboardLang === lang ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                    {lang}
                  </button>
                ))}
              </div>

              {/* Main Area */}
              <div className="flex-1 min-w-0 overflow-y-auto space-y-6">
                {/* Form Setup for this Language */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setIsFormSetupCollapsed(!isFormSetupCollapsed)}
                    className="w-full text-left px-6 py-4 border-b border-indigo-100 bg-indigo-50/80 hover:bg-indigo-100 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h2 className="text-base font-bold text-indigo-900">
                        Connect Google Form - {selectedDashboardLang}
                      </h2>
                      <p className="text-sm text-indigo-600 mt-0.5">
                        Map a Google Form to capture leads for all {selectedDashboardLang} batches.
                      </p>
                    </div>
                    <div className="text-indigo-400">
                      {isFormSetupCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>
                  {!isFormSetupCollapsed && (
                    <div className="p-6">
                      <p className="text-sm text-slate-500 mb-4">
                        Go to <strong>Workshop Forms</strong> tab after selecting a batch to connect and map a form.
                        Each batch can be linked to its own Google Form from there.
                      </p>
                      <div className="flex gap-3">
                        {workshops.filter(w => (w.language || 'English').toLowerCase() === selectedDashboardLang.toLowerCase()).map(w => (
                          <button
                            key={w.id}
                            onClick={() => { setSelectedWorkshop(w); setActiveTab('forms'); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                          >
                            <span>{w.name}</span>
                            {w.formId && <span className="text-indigo-200 text-xs">linked</span>}
                          </button>
                        ))}
                        {workshops.filter(w => (w.language || 'English').toLowerCase() === selectedDashboardLang.toLowerCase()).length === 0 && (
                          <p className="text-slate-400 text-sm">No {selectedDashboardLang} batches yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Batch Cards */}
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 mb-4">{selectedDashboardLang} Batches</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workshops
                      .filter(w => (w.language || 'English').toLowerCase() === selectedDashboardLang.toLowerCase())
                      .map(w => (
                        <button
                          key={w.id}
                          onClick={() => { setSelectedWorkshop(w); setActiveTab('forms'); }}
                          className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center">
                              {selectedDashboardLang[0]}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{w.totalForms ?? 0} forms</span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{w.name}</h3>
                          {w.formId && <p className="text-xs text-slate-400 mt-1 truncate">{w.formId}</p>}
                          {!w.formId && <p className="text-xs text-amber-500 mt-1">No form linked</p>}
                        </button>
                      ))
                    }
                    {workshops.filter(w => (w.language || 'English').toLowerCase() === selectedDashboardLang.toLowerCase()).length === 0 && (
                      <div className="col-span-3 text-center py-16 text-slate-400">
                        <p className="font-semibold">No {selectedDashboardLang} batches yet.</p>
                        <p className="text-sm mt-1">Create a batch from the sidebar.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

"""

# Insert before the !selectedWorkshop check in main
old_main_start = "          {!selectedWorkshop ? ("
if old_main_start in content:
    content = content.replace(old_main_start, all_data_panel + "          {activeTab !== 'all_data' && !selectedWorkshop ? (", 1)
    print("CHANGE 6 OK: all_data panel inserted")
else:
    print("WARN: !selectedWorkshop marker not found")

with open(filepath, 'w') as f:
    f.write(content)
print("Done! File saved.")
