const fs = require('fs');
const file = 'app/admin/crm/new-registration/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Find the Form Picker Block (from <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"> right after {/* TAB 2: Workshop Forms */} to the end of the form picker save button)

const startMarker = `              {/* TAB 2: Workshop Forms */}
              {activeTab === 'forms' && (
                <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">`;

const endMarker = `                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shadow-inner z-10">
                      <button 
                        onClick={() => {
                          if (formSource === 'internal' && !selectedFormId) {
                            toast.error('Please select a form first');
                            return;
                          }
                          if (formSource === 'google' && !googleFormUrl) {
                            toast.error('Please enter a Google Form URL');
                            return;
                          }
                          
                          if (selectedWorkshop) {
                            const updated = { 
                              ...selectedWorkshop, 
                              formId: formSource === 'google' ? googleFormUrl : selectedFormId,
                              googleFormMapping: formSource === 'google' ? fieldMapping : undefined
                            };
                            setSelectedWorkshop(updated);
                            setWorkshops(workshops.map(w => w.id === updated.id ? updated : w));
                          }
                          
                          setLinkedFormId(formSource === 'google' ? googleFormUrl : selectedFormId);
                          toast.success('Form saved! Mapping fields and fetching leads...');
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md transform hover:scale-105 active:scale-95 duration-200"
                      >
                        <Users size={18} /> Save & Map Data
                      </button>
                    </div>`;

const startIndex = content.indexOf('<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">', content.indexOf(`{/* TAB 2: Workshop Forms */}`));
const endIndex = content.indexOf('Save & Map Data\n                      </button>\n                    </div>', startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find block");
  process.exit(1);
}

const fullEndIndex = endIndex + 'Save & Map Data\n                      </button>\n                    </div>'.length;

const formPickerBlock = content.substring(startIndex, fullEndIndex);

// Modify the form picker save handler to save to ALL batches of the selected language!
const modifiedBlock = formPickerBlock.replace(
  `                          if (selectedWorkshop) {
                            const updated = { 
                              ...selectedWorkshop, 
                              formId: formSource === 'google' ? googleFormUrl : selectedFormId,
                              googleFormMapping: formSource === 'google' ? fieldMapping : undefined
                            };
                            setSelectedWorkshop(updated);
                            setWorkshops(workshops.map(w => w.id === updated.id ? updated : w));
                          }`,
  `                          // Save mapping to ALL batches in the selected language!
                          const newFormId = formSource === 'google' ? googleFormUrl : selectedFormId;
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

// Remove block from old place
content = content.substring(0, startIndex) + content.substring(fullEndIndex);

// 2. Insert into the Master Dashboard
const insertTarget = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
const insertIndex = content.indexOf(insertTarget);

if (insertIndex === -1) {
  console.log("Could not find insert target");
  process.exit(1);
}

content = content.substring(0, insertIndex) + modifiedBlock + '\n\n                ' + content.substring(insertIndex);

fs.writeFileSync(file, content);
console.log("Success");
