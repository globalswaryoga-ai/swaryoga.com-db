const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the old single button + embed area
const oldStart = `                        <button \n                          onClick={async () => {\n                            const btn = document.getElementById('btn-generate-canva');\n                            if (btn) btn.innerText = 'Generating...';`;
const oldEnd = `                               </p>\n                             </div>\n                           </>\n                         )}\n                      </div>\n                    </div>\n                  )}\n               </div>\n            )}`;

const startIdx = content.indexOf(oldStart);
const endIdx = content.indexOf(oldEnd) + oldEnd.length;

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find markers');
  process.exit(1);
}

const replacement = `                        <div className="flex gap-3 mt-6">
                          {/* Generate PDF Button */}
                          <button 
                            onClick={async () => {
                              const btn = document.getElementById('btn-generate-pdf');
                              if (btn) btn.innerText = 'Generating PDF...';
                              try {
                                const leadId = selectedLead?.id || selectedLead?._id || '';
                                const name = (document.getElementById('receipt-name') as HTMLInputElement)?.value || '';
                                const amount = (document.getElementById('receipt-amount') as HTMLInputElement)?.value || '';
                                const mode = (document.getElementById('receipt-mode') as HTMLInputElement)?.value || '';
                                const receiptNo = (document.getElementById('receipt-number') as HTMLInputElement)?.value || '';
                                const workshop = (document.getElementById('receipt-workshop') as HTMLInputElement)?.value || '';
                                const whatsapp = (document.getElementById('receipt-whatsapp') as HTMLInputElement)?.value || '';

                                // Save receipt to Bunny DB
                                await fetch('/api/admin/crm/receipts', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    leadId,
                                    receiptNumber: receiptNo,
                                    customerName: name,
                                    customerPhone: whatsapp,
                                    workshopName: workshop,
                                    issuedAt: new Date().toISOString(),
                                    payment: {
                                      amount: parseFloat(amount.replace(/[^\\d.]/g, '')) || 0,
                                      paidAmount: parseFloat(amount.replace(/[^\\d.]/g, '')) || 0,
                                      method: mode,
                                      provider: mode,
                                      paidAt: new Date().toISOString()
                                    }
                                  })
                                });

                                // Show PDF preview
                                const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1] || '';
                                setGeneratedDesignId(\`PDF_\${leadId}\`);
                                setTimeout(() => {
                                  const frame = document.getElementById('receipt-preview-frame') as HTMLIFrameElement;
                                  if (frame) frame.src = \`/api/admin/crm/receipts/pdf?leadId=\${leadId}&token=\${token}\`;
                                }, 100);
                                if (btn) { btn.innerText = '✅ Done!'; setTimeout(() => { if (btn) btn.innerText = '📄 Generate PDF'; }, 2000); }
                              } catch (error: any) {
                                alert('Error: ' + error.message);
                                if (btn) btn.innerText = '📄 Generate PDF';
                              }
                            }}
                            id="btn-generate-pdf"
                            className="flex-1 py-3.5 rounded-xl font-black text-sm transition-all bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md hover:-translate-y-0.5"
                          >
                            📄 Generate PDF
                          </button>

                          {/* Canva Button (for Teams plan) */}
                          <button 
                            onClick={async () => {
                              const btn = document.getElementById('btn-generate-canva');
                              if (btn) btn.innerText = '...';
                              try {
                                const templateId = (document.getElementById('global-template-id') as HTMLInputElement)?.value || localStorage.getItem('canvaReceiptTemplateId') || '';
                                if (!templateId) { alert('Canva Autofill requires Canva Teams plan + Brand Template ID.'); if (btn) btn.innerText = '🎨 Canva'; return; }
                                let dataToFill: any = {};
                                if (activeSection === 'receipts') {
                                  dataToFill = {
                                    Name: { type: 'text', text: (document.getElementById('receipt-name') as HTMLInputElement)?.value || '' },
                                    Amount: { type: 'text', text: (document.getElementById('receipt-amount') as HTMLInputElement)?.value || '' },
                                    Mode: { type: 'text', text: (document.getElementById('receipt-mode') as HTMLInputElement)?.value || '' },
                                    Address: { type: 'text', text: (document.getElementById('receipt-address') as HTMLInputElement)?.value || '' },
                                    ReceiptNo: { type: 'text', text: (document.getElementById('receipt-number') as HTMLInputElement)?.value || '' },
                                    WorkshopName: { type: 'text', text: (document.getElementById('receipt-workshop') as HTMLInputElement)?.value || '' },
                                    Date: { type: 'text', text: (document.getElementById('receipt-date') as HTMLInputElement)?.value || '' }
                                  };
                                } else {
                                  dataToFill = {
                                    FirstName: { type: 'text', text: (document.getElementById('cert-firstname') as HTMLInputElement)?.value || '' },
                                    FullName: { type: 'text', text: (document.getElementById('cert-fullname') as HTMLInputElement)?.value || '' },
                                    City: { type: 'text', text: (document.getElementById('cert-city') as HTMLInputElement)?.value || '' },
                                    Country: { type: 'text', text: (document.getElementById('cert-country') as HTMLInputElement)?.value || '' },
                                    BatchName: { type: 'text', text: (document.getElementById('cert-batch') as HTMLInputElement)?.value || '' },
                                    WorkshopName: { type: 'text', text: (document.getElementById('cert-workshop') as HTMLInputElement)?.value || '' },
                                    CertificateNo: { type: 'text', text: (document.getElementById('cert-number') as HTMLInputElement)?.value || '' }
                                  };
                                }
                                const res = await fetch('/api/admin/canva/autofill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId, data: dataToFill }) });
                                const json = await res.json();
                                if (json.error) throw new Error(json.error);
                                const jobId = json.job.id;
                                const poll = setInterval(async () => {
                                  const sr = await fetch(\`/api/admin/canva/autofill/status?jobId=\${jobId}\`);
                                  const sj = await sr.json();
                                  if (sj.job.status === 'success') { clearInterval(poll); setGeneratedDesignId(sj.job.result.design.id); window.open(\`https://www.canva.com/design/\${sj.job.result.design.id}/edit\`, '_blank'); if (btn) btn.innerText = '🎨 Canva'; }
                                  else if (sj.job.status === 'failed') { clearInterval(poll); alert('Canva autofill requires Canva Teams plan.'); if (btn) btn.innerText = '🎨 Canva'; }
                                }, 2000);
                              } catch (error: any) { alert(error.message); if (btn) btn.innerText = '🎨 Canva'; }
                            }}
                            id="btn-generate-canva"
                            className="w-24 py-3.5 rounded-xl font-black text-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5"
                          >
                            🎨 Canva
                          </button>
                        </div>
                      </div>

                      {/* Preview Area */}
                      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center p-8 relative overflow-hidden">
                         {generatedDesignId ? (
                           generatedDesignId.startsWith('PDF_') ? (
                             <iframe 
                               id="receipt-preview-frame"
                               src=""
                               className="w-full h-full border-0 rounded-xl"
                             />
                           ) : (
                             <iframe 
                               src={\`https://www.canva.com/design/\${generatedDesignId}/view?embed\`} 
                               className="w-full h-full border-0 rounded-xl"
                               allowFullScreen
                             />
                           )
                         ) : (
                           <>
                             <div className="absolute inset-0 bg-slate-50/50"></div>
                             <div className="relative z-10 flex flex-col items-center">
                               <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
                                 {activeSection === 'receipts' ? <FileText className="h-16 w-16 text-indigo-300" /> : <Share2 className="h-16 w-16 text-indigo-300" />}
                               </div>
                               <h4 className="text-2xl font-black text-slate-700 mb-3">Receipt Preview</h4>
                               <p className="text-slate-500 text-center max-w-md text-lg">
                                 Click "Generate PDF" to create a {activeSection === 'receipts' ? 'receipt' : 'certificate'} and preview it here. Uses Bunny DB — no Canva needed.
                               </p>
                             </div>
                           </>
                         )}
                      </div>
                    </div>
                  )}
               </div>
            )}`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(file, content);
console.log('Done!');
