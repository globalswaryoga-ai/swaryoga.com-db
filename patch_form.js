const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/form-questions/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the modal content to make it simpler and Google Form like
content = content.replace(
  /<div className="space-y-4 pt-4">([\s\S]*?)<div className="pt-4 flex justify-end">/g,
  `<div className="space-y-6 pt-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Form Title *</label>
                <input
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Untitled Form"
                  value={formSettingsData.workshopName || ''}
                  onChange={e => setFormSettingsData({ ...formSettingsData, workshopName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Form Description</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Form description"
                  rows={3}
                  value={formSettingsData.description || ''}
                  onChange={e => setFormSettingsData({ ...formSettingsData, description: e.target.value })}
                />
              </div>
              
              <details className="group">
                <summary className="text-sm font-bold text-indigo-600 cursor-pointer list-none flex items-center gap-2">
                  <span>▶</span> Advanced Workshop Settings (Optional)
                </summary>
                <div className="mt-4 space-y-4 pl-4 border-l-2 border-indigo-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-slate-200" placeholder="e.g. 15 Dec 2026" value={formSettingsData.workshopDate || ''} onChange={e => setFormSettingsData({ ...formSettingsData, workshopDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-slate-200" placeholder="e.g. 20 Dec 2026" value={formSettingsData.workshopEndDate || ''} onChange={e => setFormSettingsData({ ...formSettingsData, workshopEndDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-slate-200" placeholder="e.g. 6:00 AM - 7:30 AM" value={formSettingsData.workshopTime || ''} onChange={e => setFormSettingsData({ ...formSettingsData, workshopTime: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-slate-200" placeholder="e.g. 1 Hour 30 Mins" value={formSettingsData.duration || ''} onChange={e => setFormSettingsData({ ...formSettingsData, duration: e.target.value })} />
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <div className="pt-4 flex justify-end">`
);

fs.writeFileSync(file, content);
console.log('Patched');
