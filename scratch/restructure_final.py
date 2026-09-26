filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    lines = f.readlines()

# We know (0-indexed):
# Line 1514 (idx 1513): <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
# Line 1515 (idx 1514): <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">  <- Form Setup block START
# Line 1886 (idx 1885): </div>  <- closes the form setup outer div
# Line 1887-1888: empty lines
# Line 1889 (idx 1888): {/* Render Fetched Leads Inline in Forms Tab */}  <- Linked Leads START
# Line 2194 (idx 2193): </div>  <- closes forms tab outer div
# Line 2195 (idx 2194): )}  <- closes activeTab === 'forms' block

# STEP 1: Extract the form setup block (lines 1515–1888, idx 1514–1887)
form_setup_block_lines = lines[1514:1888]
form_setup_block = ''.join(form_setup_block_lines)

# STEP 2: In the forms tab, replace the entire content from idx 1513 to 2194
# NEW content: just show "Workshop Forms" title + Linked Leads (no form setup)
# The linked leads section starts at idx 1888 and ends at idx 2193

linked_leads_lines = lines[1888:2194]
linked_leads = ''.join(linked_leads_lines)

new_forms_tab = f"""              {{/* TAB 2: Workshop Forms */}}
              {{activeTab === 'forms' && (
                <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
                  {{/* Linked Leads */}}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Workshop Forms &ndash; {{leadsData.length}}</h2>
                        <p className="text-sm text-slate-500">Leads captured from the connected Google Form.</p>
                      </div>
                    </div>
                    {linked_leads}  </div>
                </div>
              )}}
"""

# STEP 3: Rebuild the file
# Keep everything before idx 1511 (TAB 2 comment)
before_forms = lines[:1511]
# Keep everything after idx 2195 (TAB 3 onwards)  
after_forms = lines[2195:]

with open(filepath, 'w') as f:
    f.writelines(before_forms)
    f.write(new_forms_tab)
    f.writelines(after_forms)

print("Step 1 done: forms tab restructured")
print("Form setup block length:", len(form_setup_block_lines), "lines")

# STEP 4: Now add form setup to the all_data tab
# The all_data panel currently ends around where we inserted it
# We need to find the "Batches Area" div in all_data and insert form setup BEFORE the batch cards

with open(filepath, 'r') as f:
    content2 = f.read()

all_data_insert = """              {/* Batches Area */}
              <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-extrabold text-slate-800">{selectedDashboardLang} Batches</h2>
                </div>

                {/* Form Setup for this Language */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                  <button
                    onClick={() => setIsFormSetupCollapsed(!isFormSetupCollapsed)}
                    className="w-full text-left px-6 py-4 border-b border-indigo-100 bg-indigo-50/80 hover:bg-indigo-100 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h2 className="text-base font-bold text-indigo-900 flex items-center gap-2">
                        ⚙️ {selectedDashboardLang} Workshop Form Setup
                      </h2>
                      <p className="text-sm text-indigo-700 mt-0.5">
                        Connect & map a Google Form to capture leads for all {selectedDashboardLang} batches.
                      </p>
                    </div>
                    <div className="text-indigo-400">
                      {isFormSetupCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>
                  {!isFormSetupCollapsed && (
                    <div className="p-6">
""" + form_setup_block + """                    </div>
                  )}
                </div>

                {/* Batch Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">"""

old_batches_area = """              {/* Batches Area */}
              <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-800">{selectedDashboardLang} Batches</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">"""

if old_batches_area in content2:
    content2 = content2.replace(old_batches_area, all_data_insert, 1)
    with open(filepath, 'w') as f:
        f.write(content2)
    print("Step 2 done: form setup added to all_data tab")
else:
    print("WARN: Could not find old_batches_area in file! Checking...")
    # Let's print surrounding area
    idx = content2.find('Batches Area')
    if idx >= 0:
        print("Found 'Batches Area' at:", idx)
        print("Context:", repr(content2[idx-100:idx+500]))
