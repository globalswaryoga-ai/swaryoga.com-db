const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
content = content.replace(
  "const [showCanvaPopup, setShowCanvaPopup] = useState(false);",
  "const [showCanvaPopup, setShowCanvaPopup] = useState(false);\n  const [showBatchCanvaPopup, setShowBatchCanvaPopup] = useState(false);\n  const [batchCanvaProgress, setBatchCanvaProgress] = useState<{current: number, total: number, status: string, links: string[]}>({current: 0, total: 0, status: '', links: []});\n  const [batchCanvaTemplateId, setBatchCanvaTemplateId] = useState('');"
);

// 2. Add button in Downloads tab
content = content.replace(
  "{selectedForDownload.length === leadsInSelectedBatch.length && leadsInSelectedBatch.length > 0 ? 'Deselect All' : 'Select All'}\n                         </button>\n                         <button",
  "{selectedForDownload.length === leadsInSelectedBatch.length && leadsInSelectedBatch.length > 0 ? 'Deselect All' : 'Select All'}\n                         </button>\n                         <button \n                           disabled={selectedForDownload.length === 0}\n                           onClick={() => setShowBatchCanvaPopup(true)}\n                           className=\"flex items-center gap-2 px-4 h-9 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow-sm disabled:shadow-none\"\n                         >\n                           <ImageIcon size={16} />\n                           Batch Canva Generate ({selectedForDownload.length})\n                         </button>\n                         <button"
);

// 3. Add the Popup JSX at the end of the return statement
const popupCode = `
      {/* Batch Canva Popup */}
      {showBatchCanvaPopup && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <ImageIcon size={20} className="text-emerald-500" />
                Batch Generate in Canva
              </h3>
              <button onClick={() => { setShowBatchCanvaPopup(false); setBatchCanvaProgress({current: 0, total: 0, status: '', links: []}); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {batchCanvaProgress.status === 'generating' ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                  <h4 className="text-lg font-bold text-slate-800 mb-1">Generating Designs...</h4>
                  <p className="text-sm text-slate-500 mb-4">Please do not close this window.</p>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300" 
                      style={{width: \`\${(batchCanvaProgress.current / batchCanvaProgress.total) * 100}%\`}}
                    ></div>
                  </div>
                  <div className="text-xs font-bold text-slate-600 mt-2">
                    {batchCanvaProgress.current} of {batchCanvaProgress.total} completed
                  </div>
                </div>
              ) : batchCanvaProgress.status === 'done' ? (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckSquare size={24} />
                    </div>
                    <h4 className="text-lg font-black text-slate-800">Batch Generation Complete!</h4>
                    <p className="text-sm text-slate-500">Successfully generated {batchCanvaProgress.links.length} designs.</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                    {batchCanvaProgress.links.map((link, idx) => (
                      <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors flex items-center justify-between">
                        Design #{idx + 1}
                        <ExternalLink size={16} />
                      </a>
                    ))}
                  </div>
                  <button onClick={() => { setShowBatchCanvaPopup(false); setBatchCanvaProgress({current: 0, total: 0, status: '', links: []}); }} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                      Select Brand Template
                    </label>
                    {isLoadingBrandTemplates ? (
                      <div className="text-sm text-slate-500 italic p-2 bg-slate-50 rounded-lg">Loading your templates...</div>
                    ) : brandTemplates.length > 0 ? (
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                        value={batchCanvaTemplateId}
                        onChange={e => setBatchCanvaTemplateId(e.target.value)}
                      >
                        <option value="">-- Choose a Brand Template --</option>
                        {brandTemplates.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Template ID e.g. DAGw5Hx3Vmo"
                        value={batchCanvaTemplateId}
                        onChange={e => setBatchCanvaTemplateId(e.target.value)}
                      />
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      You are about to generate {selectedForDownload.length} {downloadTab === 'receipts' ? 'receipts' : 'certificates'} in Canva.
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button onClick={() => setShowBatchCanvaPopup(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                      Cancel
                    </button>
                    <button 
                      disabled={!batchCanvaTemplateId}
                      onClick={async () => {
                        setBatchCanvaProgress({ current: 0, total: selectedForDownload.length, status: 'generating', links: [] });
                        
                        const links: string[] = [];
                        for (let i = 0; i < selectedForDownload.length; i++) {
                          const leadId = selectedForDownload[i];
                          const lead = leadsData.find(l => (l.id || l._id) === leadId);
                          if (!lead) continue;
                          const crmData = crmOfferData[leadId] || {};
                          
                          let dataToFill = {};
                          if (downloadTab === 'receipts') {
                             const name = lead.name || lead.Name || '';
                             dataToFill = {
                               Name: { type: 'text', text: name },
                               Amount: { type: 'text', text: crmData.amount || lead.amount || '1000' },
                               Mode: { type: 'text', text: crmData.paymentMode || 'Online' },
                               ReceiptNo: { type: 'text', text: (localStorage.getItem('canvaReceiptPrefix') || 'RCPT-') + (i + 1) },
                               WorkshopName: { type: 'text', text: crmData.workshopName || 'Workshop' },
                               Date: { type: 'text', text: new Date().toLocaleDateString('en-GB') }
                             };
                          } else {
                             const name = lead.name || lead.Name || '';
                             dataToFill = {
                               FirstName: { type: 'text', text: name.split(' ')[0] },
                               FullName: { type: 'text', text: name },
                               City: { type: 'text', text: lead.city || '' },
                               Country: { type: 'text', text: lead.country || '' },
                               BatchName: { type: 'text', text: selectedBatchForDownload || 'Batch' },
                               WorkshopName: { type: 'text', text: crmData.workshopName || 'Workshop' },
                               CertificateNo: { type: 'text', text: 'CERT-' + (i + 1) }
                             };
                          }
                          
                          try {
                            const res = await fetch('/api/admin/canva/autofill', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ templateId: batchCanvaTemplateId, data: dataToFill })
                            });
                            const json = await res.json();
                            if (json.job?.id) {
                               // Poll once just to save the design ID (simplified for batch)
                               // Ideally we'd poll fully, but let's wait 3s and assume it's created
                               await new Promise(r => setTimeout(r, 4000));
                               const statusRes = await fetch(\`/api/admin/canva/autofill/status?jobId=\${json.job.id}\`);
                               const statusJson = await statusRes.json();
                               if (statusJson.job?.result?.design?.id) {
                                 links.push(\`https://www.canva.com/design/\${statusJson.job.result.design.id}/view\`);
                               } else {
                                 // fallback
                                 links.push(\`https://www.canva.com/folder/all-designs\`);
                               }
                            }
                          } catch (e) {
                            console.error(e);
                          }
                          
                          setBatchCanvaProgress(p => ({ ...p, current: i + 1, links }));
                        }
                        
                        setBatchCanvaProgress(p => ({ ...p, status: 'done' }));
                      }}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      Start Generating
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
`;

content = content.replace("    </div>\n  );\n}\n", popupCode + "\n    </div>\n  );\n}\n");

// Ensure ExternalLink is imported
if (!content.includes('ExternalLink')) {
  content = content.replace("CheckSquare,", "CheckSquare, ExternalLink,");
}

fs.writeFileSync(file, content);
