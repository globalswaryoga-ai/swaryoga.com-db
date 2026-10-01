const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

const oldTabsBlock = `                 <div className="flex gap-4 mb-8">
                   <button
                     onClick={() => setDownloadTab('meta')}
                     className={\`px-8 py-3 rounded-full text-sm font-black transition-all \${downloadTab === 'meta' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}\`}
                   >
                     Meta Work
                   </button>
                   <button
                     onClick={() => setDownloadTab('receipts')}
                     className={\`px-8 py-3 rounded-full text-sm font-black transition-all \${downloadTab === 'receipts' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}\`}
                   >
                     Receipts
                   </button>
                   <button
                     onClick={() => setDownloadTab('certificate')}
                     className={\`px-8 py-3 rounded-full text-sm font-black transition-all \${downloadTab === 'certificate' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}\`}
                   >
                     Certificates
                   </button>
                 </div>`;
                 
const newTabsBlock = `                 <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
                   <button
                     onClick={() => setDownloadTab('meta')}
                     className={\`px-5 py-2 rounded-lg text-sm font-bold transition-all \${downloadTab === 'meta' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}\`}
                   >
                     Meta Work
                   </button>
                   <button
                     onClick={() => setDownloadTab('receipts')}
                     className={\`px-5 py-2 rounded-lg text-sm font-bold transition-all \${downloadTab === 'receipts' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}\`}
                   >
                     Receipts
                   </button>
                   <button
                     onClick={() => setDownloadTab('certificate')}
                     className={\`px-5 py-2 rounded-lg text-sm font-bold transition-all \${downloadTab === 'certificate' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}\`}
                   >
                     Certificates
                   </button>
                 </div>`;

if (code.includes(oldTabsBlock)) {
  code = code.replace(oldTabsBlock, newTabsBlock);
  fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
  console.log("Successfully shrunk buttons!");
} else {
  console.log("Failed to find block");
}
