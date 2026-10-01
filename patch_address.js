const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'Mode: { type: \'text\', text: (document.getElementById(\'receipt-mode\') as HTMLInputElement)?.value || \'\' },',
  'Mode: { type: \'text\', text: (document.getElementById(\'receipt-mode\') as HTMLInputElement)?.value || \'\' },\n                                  Address: { type: \'text\', text: (document.getElementById(\'receipt-address\') as HTMLInputElement)?.value || \'\' },'
);

content = content.replace(
  '<div>\n                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Payment Details</label>',
  '<div>\n                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Address</label>\n                                <input id="receipt-address" type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 text-sm truncate" defaultValue={receiptData.address} />\n                              </div>\n                              <div>\n                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">Payment Details</label>'
);

content = content.replace(
  'Mode: { type: \'text\', text: crmData.paymentMode || \'Online\' },\n                               ReceiptNo:',
  'Mode: { type: \'text\', text: crmData.paymentMode || \'Online\' },\n                               Address: { type: \'text\', text: lead.address || lead.Address || crmData.address || `${lead.city || \'\'} ${lead.country || \'\'}`.trim() || \'N/A\' },\n                               ReceiptNo:'
);

fs.writeFileSync(file, content);
