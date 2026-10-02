const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const newModalUI = `
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                🤖 {activeModal} Configuration
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
              
              {modalConditions.map((condition, idx) => (
                <div key={idx} className="space-y-4 border border-slate-200 rounded-xl p-5 bg-white shadow-sm relative">
                  {/* Row 1: Question Key */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Question Key (or column name)</label>
                    <select
                      value={condition.question}
                      onChange={(e) => {
                        const updated = [...modalConditions];
                        updated[idx].question = e.target.value;
                        setModalConditions(updated);
                      }}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">-- Search across all questions --</option>
                      {availableQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>

                  {/* Row 2: Success Match */}
                  <div className="p-3 rounded-lg border flex items-center gap-3" style={{ backgroundColor: condition.successColor || '#e6ffed' }}>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">If Correct Answer Matches:</label>
                      <input
                        type="text"
                        placeholder="Keyword(s)"
                        value={condition.keyword}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].keyword = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Move to Category:</label>
                      <select
                        value={condition.successCategory || ''}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].successCategory = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none"
                      >
                        <option value="">-- Select --</option>
                        {SIDEBAR_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Color</label>
                      <input 
                        type="color" 
                        value={condition.successColor || '#e6ffed'}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].successColor = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="h-8 w-12 cursor-pointer rounded border"
                      />
                    </div>
                  </div>

                  {/* Row 3: Failure Mismatch */}
                  <div className="p-3 rounded-lg border flex items-center gap-3" style={{ backgroundColor: condition.failColor || '#fff3cd' }}>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">If Answer Mismatches, Move to:</label>
                      <select
                        value={condition.failCategory || ''}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].failCategory = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none"
                      >
                        <option value="">-- Select --</option>
                        {SIDEBAR_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Color</label>
                      <input 
                        type="color" 
                        value={condition.failColor || '#fff3cd'}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].failColor = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="h-8 w-12 cursor-pointer rounded border"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => saveAiFilter(activeModal, modalConditions)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                Submit Config & Run
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(/\{activeModal && \([\s\S]*?(?=\{\s*selectedQueryLeadId && \()/m, newModalUI + '\n\n');
fs.writeFileSync(file, content);
console.log("Updated AI modal UI");
