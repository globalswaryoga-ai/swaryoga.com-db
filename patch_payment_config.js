const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/form-questions/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the {HAS_OPTIONS...} block and append Payment config
content = content.replace(
  /\{\/\* Options \*\/\}/g,
  `{/* Payment Config */}
              {qData.questionType === 'payment' && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-4">
                  <label className="block text-xs font-bold text-emerald-700 mb-3 uppercase tracking-wider">Payment Configuration</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Amount</label>
                      <input type="number" min="0" value={qData.paymentConfig?.amount || ''} onChange={e => setQData(f => ({ ...f, paymentConfig: { ...(f.paymentConfig || {}), amount: Number(e.target.value) } }))} placeholder="e.g. 500" className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Currency</label>
                      <select value={qData.paymentConfig?.currency || 'INR'} onChange={e => setQData(f => ({ ...f, paymentConfig: { ...(f.paymentConfig || {}), currency: e.target.value } }))} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none bg-white">
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Button Text</label>
                    <input value={qData.paymentConfig?.buttonText || ''} onChange={e => setQData(f => ({ ...f, paymentConfig: { ...(f.paymentConfig || {}), buttonText: e.target.value } }))} placeholder="e.g. Pay Now" className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none" />
                  </div>
                </div>
              )}

              {/* Options */}`
);

fs.writeFileSync(file, content);
console.log('Patched payment config');
