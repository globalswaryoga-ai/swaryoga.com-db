const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

const oldBtn = `              <button 
                onClick={() => { setActiveSection('downloads'); setDownloadTab('receipts'); }}
                className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all \${activeSection === 'downloads' && downloadTab !== 'meta' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'}\`}
             >
               <Download size={16} className={activeSection === 'downloads' && downloadTab !== 'meta' ? 'text-indigo-600' : 'text-slate-400'} />
               Downloads
             </button>`;
             
const newBtn = `              <button 
                onClick={() => { setActiveSection('downloads'); setDownloadTab('meta'); }}
                className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all \${activeSection === 'downloads' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'}\`}
             >
               <Download size={16} className={activeSection === 'downloads' ? 'text-indigo-600' : 'text-slate-400'} />
               Downloads
             </button>`;

code = code.replace(oldBtn, newBtn);
fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
