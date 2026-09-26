const fs = require('fs');
const file = 'app/admin/crm/new-registration/page.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// 1. activeTab State
let tabLineIdx = lines.findIndex(l => l.includes("const [activeTab, setActiveTab]"));
if(tabLineIdx !== -1) {
  lines[tabLineIdx] = "  const [activeTab, setActiveTab] = useState<'all_data'|'details'|'forms'|'leads'|'closing'|'templates'>('all_data');";
}

// 2. selectedDashboardLang
lines.splice(tabLineIdx + 1, 0, "  const [selectedDashboardLang, setSelectedDashboardLang] = useState('English');");

// 3. Add to tabs array
let tabsStart = lines.findIndex(l => l.includes("const tabs = ["));
if (tabsStart !== -1) {
  lines.splice(tabsStart + 1, 0, "    { id: 'all_data', label: 'Leads All Data', icon: Users },");
}

// 4. Hide Global Sidebar
let sidebarStart = lines.findIndex(l => l.includes("{/* Global Sidebar for Batch Selection */}"));
if (sidebarStart !== -1) {
  lines.splice(sidebarStart + 1, 0, "      {activeTab !== 'all_data' && (");
  let asideEnd = lines.findIndex((l, i) => i > sidebarStart && l.includes("</aside>"));
  if(asideEnd !== -1) {
    lines.splice(asideEnd + 1, 0, "      )}");
  }
}

// 5. Replace `activeTab !== 'all_data'` empty state check
let emptyCheck = lines.findIndex(l => l.includes("!selectedWorkshop ? ("));
if (emptyCheck !== -1 && !lines[emptyCheck].includes("activeTab !== 'all_data'")) {
  lines[emptyCheck] = "          {activeTab !== 'all_data' && !selectedWorkshop ? (";
}

// 6. Extract Form Picker block
let formPickerStartLine = -1;
let formPickerEndLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onClick={() => setIsFormSetupCollapsed(!isFormSetupCollapsed)}')) {
    formPickerStartLine = i - 2; // <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    break;
  }
}

for (let i = formPickerStartLine; i < lines.length; i++) {
  if (lines[i].includes('<Users size={18} /> Save & Map Data')) {
    formPickerEndLine = i + 2; // ends with </button>\n </div>
    break;
  }
}

let formPickerBlock = lines.slice(formPickerStartLine, formPickerEndLine + 1).join('\n');
lines.splice(formPickerStartLine, formPickerEndLine - formPickerStartLine + 1);

// We need to add the missing <div className="bg-white ..."> back for the data table
lines.splice(formPickerStartLine, 0, '                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">');

// Modify the save handler
formPickerBlock = formPickerBlock.replace(
  `                          if (selectedWorkshop) {
                            const updated = { 
                              ...selectedWorkshop, 
                              formId: formSource === 'google' ? googleFormUrl : selectedFormId,
                              googleFormMapping: formSource === 'google' ? fieldMapping : undefined
                            };
                            setSelectedWorkshop(updated);
                            setWorkshops(workshops.map(w => w.id === updated.id ? updated : w));
                          }`,
  `                          const newFormId = formSource === 'google' ? googleFormUrl : selectedFormId;
                          const newMapping = formSource === 'google' ? fieldMapping : undefined;
                          
                          const updatedWorkshops = workshops.map(w => {
                            if (w.language === selectedDashboardLang || (!w.language && selectedDashboardLang === 'English')) {
                              return { ...w, formId: newFormId, googleFormMapping: newMapping };
                            }
                            return w;
                          });
                          
                          setWorkshops(updatedWorkshops);
                          
                          if (selectedWorkshop && (selectedWorkshop.language === selectedDashboardLang || (!selectedWorkshop.language && selectedDashboardLang === 'English'))) {
                            setSelectedWorkshop({ ...selectedWorkshop, formId: newFormId, googleFormMapping: newMapping });
                          }`
);

// Close the div we opened for form picker, and add mb-6
formPickerBlock = formPickerBlock.replace('className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"', 'className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6"');
formPickerBlock += '\n                </div>';

// 7. Inject Master Dashboard layout
const masterDashboardLayout = `
          {/* TAB 0: Leads All Data (Master Dashboard) */}
          {activeTab === 'all_data' && (
            <div className="flex gap-6 h-full">
              {/* Sidebar for Language */}
              <div className="w-64 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 shrink-0 flex flex-col gap-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Languages</h3>
                {['Marathi', 'Hindi', 'English', 'Kannada'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedDashboardLang(lang)}
                    className={\`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all \${
                      selectedDashboardLang === lang 
                        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100' 
                        : 'text-slate-600 hover:bg-slate-50 font-medium border border-transparent'
                    }\`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder size={16} className={selectedDashboardLang === lang ? "text-indigo-600" : "text-slate-400"} />
                      {lang}
                    </div>
                  </button>
                ))}
              </div>

              {/* Working Area for Batches */}
              <div className="flex-1 min-w-0 flex flex-col h-full bg-slate-50">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-800">
                    {selectedDashboardLang} Batches
                  </h2>
                  <button 
                    onClick={() => setIsAddBatchModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                  >
                    <Plus size={18} /> New Batch
                  </button>
                </div>

                ${formPickerBlock}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workshops.filter(w => w.language === selectedDashboardLang || (!w.language && selectedDashboardLang === 'English')).map(w => (
                    <div 
                      key={w.id} 
                      onClick={() => { setSelectedWorkshop(w); setActiveTab('details'); }}
                      className="group border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-slate-50 hover:bg-white"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {w.name.charAt(0)}
                        </div>
                        <span className="bg-white border border-slate-200 text-slate-600 text-xs px-2 py-1 rounded-lg font-bold shadow-sm">
                          {w.leads} forms
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{w.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{w.formId || 'No form linked'}</p>
                    </div>
                  ))}
                  {workshops.filter(w => w.language === selectedDashboardLang || (!w.language && selectedDashboardLang === 'English')).length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                      <Folder size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No batches found for {selectedDashboardLang}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
`;

let mainStart = lines.findIndex(l => l.includes('<main className="flex-1 overflow-y-auto p-6 bg-slate-50">'));
if(mainStart !== -1) {
  lines.splice(mainStart + 1, 0, masterDashboardLayout);
}

// 8. Update New Batch Language selector
let modalContent = lines.findIndex(l => l.includes("const newBatch = {"));
if (modalContent !== -1) {
    let newBatchNameInput = lines.findIndex((l, i) => i > mainStart && l.includes('onChange={e => setNewBatchName(e.target.value)}'));
    
    // We need to add `newBatchLanguage` state and selector
}

fs.writeFileSync(file, lines.join('\n'));
console.log("Success");
