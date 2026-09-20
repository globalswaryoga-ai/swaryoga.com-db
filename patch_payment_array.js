const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/form-questions/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the current Payment Config UI block with an array-based UI block
const newBlock = `{/* Payment Config (Multiple Options) */}
              {qData.questionType === 'payment' && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-4">
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">Payment Options</label>
                  
                  {(!Array.isArray(qData.paymentConfig) ? (qData.paymentConfig ? [qData.paymentConfig] : []) : qData.paymentConfig).map((payOpt, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm relative">
                      <button 
                        onClick={() => {
                          const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                          arr.splice(i, 1);
                          setQData(f => ({ ...f, paymentConfig: arr }));
                        }} 
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200"
                      >×</button>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Amount</label>
                          <input type="number" min="0" value={payOpt.amount || ''} onChange={e => {
                            const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                            arr[i] = { ...arr[i], amount: Number(e.target.value) };
                            setQData(f => ({ ...f, paymentConfig: arr }));
                          }} placeholder="e.g. 500" className="w-full h-8 px-2 border border-slate-200 rounded-lg text-sm outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Currency</label>
                          <select value={payOpt.currency || 'INR'} onChange={e => {
                            const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                            arr[i] = { ...arr[i], currency: e.target.value };
                            setQData(f => ({ ...f, paymentConfig: arr }));
                          }} className="w-full h-8 px-2 border border-slate-200 rounded-lg text-sm outline-none bg-white">
                            <option value="INR">INR (₹)</option>
                            <option value="NPR">NPR (रु)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Button Text</label>
                        <input value={payOpt.buttonText || ''} onChange={e => {
                          const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                          arr[i] = { ...arr[i], buttonText: e.target.value };
                          setQData(f => ({ ...f, paymentConfig: arr }));
                        }} placeholder="e.g. Pay Now" className="w-full h-8 px-2 border border-slate-200 rounded-lg text-sm outline-none" />
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => {
                      const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                      arr.push({ amount: 0, currency: 'INR', buttonText: 'Pay Now' });
                      setQData(f => ({ ...f, paymentConfig: arr }));
                    }}
                    className="w-full py-2 border border-dashed border-emerald-300 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                  >
                    + Add Payment Option
                  </button>
                </div>
              )}`;

content = content.replace(
  /\{\/\* Payment Config \*\/\}(.|\n)*?\{\/\* Options \*\/\}/m,
  newBlock + '\n\n              {/* Options */}'
);

fs.writeFileSync(file, content);
console.log('Patched array payment config');
