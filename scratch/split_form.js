const fs = require('fs');
const file = 'app/admin/crm/new-registration/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onClick={() => setIsFormSetupCollapsed(!isFormSetupCollapsed)}')) {
    startLine = i - 2; // the <button> is wrapped by <div className="bg-white rounded-2xl...">
    break;
  }
}

for (let i = startLine; i < lines.length; i++) {
  if (lines[i].includes('<Users size={18} /> Save & Map Data')) {
    endLine = i + 2; // ends with </button>\n </div>
    break;
  }
}

console.log("Start line:", startLine);
console.log("End line:", endLine);
console.log("End line text:", lines[endLine]);

const formPickerBlock = lines.slice(startLine, endLine + 1).join('\n');

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

// We need to add `mb-6` to the opening div, and append `</div>` to the end of the block.
const wrapperModified = modifiedBlock.replace('className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"', 'className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6"') + '\n                </div>';


// Now delete from the array
lines.splice(startLine, endLine - startLine + 1);

// We need to add the opening div for the data table that was left behind
// The data table starts at the index where we just deleted
lines.splice(startLine, 0, '                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">');

// Now we find where to insert the form picker block in all_data tab
let insertLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">')) {
    insertLine = i;
    break;
  }
}

lines.splice(insertLine, 0, wrapperModified);

fs.writeFileSync(file, lines.join('\n'));
console.log("Success");
