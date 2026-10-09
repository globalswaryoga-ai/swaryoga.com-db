import fs from 'fs';
const file = 'app/admin/crm/new-registration/_MetaLeadsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const uploadUi = `
                        <button 
                            onClick={() => setIsAutoSync(!isAutoSync)}
                            className={\`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm \${isAutoSync ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}\`}
                        >
                            <Bot size={16} className={isAutoSync ? "text-emerald-500 animate-pulse" : ""} />
                            AI-9A Auto-Sync
                        </button>
                        
                        <label className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm cursor-pointer ml-auto">
                            <Download size={16} className="rotate-180" />
                            Import CSV
                            <input 
                                type="file" 
                                accept=".csv" 
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setIsSyncing(true);
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        formData.append('workshopId', selectedWorkshop?.id || '');
                                        formData.append('workshopName', selectedWorkshop?.name || '');
                                        
                                        const res = await fetch('/api/admin/crm/meta-leads/import-csv', {
                                            method: 'POST',
                                            body: formData
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(\`Successfully imported \${data.syncedCount} new leads!\`);
                                        } else {
                                            alert(\`Import failed: \${data.error}\`);
                                        }
                                    } catch (err: any) {
                                        alert(\`Error uploading file: \${err.message}\`);
                                    } finally {
                                        setIsSyncing(false);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </label>
`;

code = code.replace(
`                        <button 
                            onClick={() => setIsAutoSync(!isAutoSync)}
                            className={\`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm \${isAutoSync ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}\`}
                        >
                            <Bot size={16} className={isAutoSync ? "text-emerald-500 animate-pulse" : ""} />
                            AI-9A Auto-Sync
                        </button>`,
uploadUi
);

fs.writeFileSync(file, code);
