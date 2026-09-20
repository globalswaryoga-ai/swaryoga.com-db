const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/form-questions/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace "Create Form" click handler
content = content.replace(
  `onClick={() => { setFormSettingsData({}); setShowFormSettings(true); }}`,
  `onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/enquiry-forms', { 
                      method: 'POST', 
                      headers: authHeaders(), 
                      body: JSON.stringify({ workshopName: 'Untitled Form' }) 
                    });
                    const data = await res.json();
                    if (data.success && data.form) {
                      setForms([data.form, ...forms]);
                      setActiveForm(data.form);
                      showToast('Form created!');
                    }
                  } catch (e) {
                    showToast('Failed to create form', 'error');
                  }
                }}`
);

// Make the form header directly clickable to edit settings instead of just the gear icon
content = content.replace(
  /<h1 className="text-3xl font-bold text-slate-900 mb-2 pr-12">\{activeForm\.workshopName\}<\/h1>[\s\S]*?<p className="text-slate-500 whitespace-pre-wrap">\{activeForm\.description \|\| 'No description provided\.'\}<\/p>/,
  `<div 
                  onClick={() => { setFormSettingsData(activeForm); setShowFormSettings(true); }}
                  className="cursor-pointer group/header hover:bg-slate-50 p-4 -ml-4 rounded-xl transition-colors border border-transparent hover:border-slate-200 border-dashed"
                >
                  <h1 className="text-4xl font-bold text-slate-900 mb-2 pr-12 group-hover/header:text-indigo-600 transition-colors">
                    {activeForm.workshopName}
                    <span className="text-sm font-normal text-indigo-400 ml-3 opacity-0 group-hover/header:opacity-100 transition-opacity">✏️ Edit</span>
                  </h1>
                  <p className="text-slate-500 text-lg whitespace-pre-wrap">{activeForm.description || 'No description provided. Click here to add one.'}</p>
                </div>`
);

fs.writeFileSync(file, content);
console.log('Patched');
