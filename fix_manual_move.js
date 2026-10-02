const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add handleMoveSelected function
const getAgeStr = "  const getAge = (raw: any) => {";
const handleMoveFunc = `  const handleMoveSelected = (targetStatus: string) => {
    if (!targetStatus) return;
    const newDecisions = { ...batchDecisions };
    selectedLeads.forEach(leadId => {
      const current = newDecisions[leadId] || {};
      newDecisions[leadId] = { ...current, status: targetStatus, reason: 'Manual Move' };
    });
    setBatchDecisions(newDecisions);
    if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(newDecisions));
    setSelectedLeads([]);
    toast.success(\`Moved \${selectedLeads.length} leads!\`);
  };

`;
content = content.replace(getAgeStr, handleMoveFunc + getAgeStr);

// 2. Add Select/Move UI to Header
const headerStr = `                      {activeTab === 'take_zoom_meeting' && (
                        <button
                          onClick={handleWhatsAppMessengerClick}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >
                          💬 WhatsApp Messenger
                        </button>
                      )}`;
const selectMoveUI = headerStr + `
                      {selectedLeads.length > 0 && (
                        <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                          <span className="text-xs font-bold text-indigo-800">{selectedLeads.length} selected</span>
                          <select 
                            className="text-sm rounded border-indigo-200 py-1 pl-2 pr-6 outline-none bg-white"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleMoveSelected(e.target.value);
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="">Move to...</option>
                            {SIDEBAR_TABS.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      )}`;
content = content.replace(headerStr, selectMoveUI);

// 3. Add checkboxes to thead
const theadStr = `                          <tr>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[150px]">Name</th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">WhatsApp</th>`;
const newTheadStr = `                          <tr>
                            <th className="px-4 py-3 min-w-[50px]">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={selectedLeads.length > 0 && selectedLeads.length === currentTabLeads.length}
                                onChange={toggleSelectAll}
                              />
                            </th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[150px]">Name</th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">WhatsApp</th>`;
content = content.replace(theadStr, newTheadStr);

// 4. Add checkboxes to tbody rows
const tbodyStr = `                              <tr key={lead.id || i} className={rowBg}>
                                <td className="px-4 py-3 font-medium text-slate-900">{lead.name || 'Unknown'}</td>
                                <td className="px-4 py-3">`;
const newTbodyStr = `                              <tr key={lead.id || i} className={rowBg}>
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={selectedLeads.includes(lead.id)}
                                    onChange={() => toggleLeadSelection(lead.id)}
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">{lead.name || 'Unknown'}</td>
                                <td className="px-4 py-3">`;
content = content.replace(tbodyStr, newTbodyStr);

fs.writeFileSync(file, content);
console.log("Updated with manual move feature");
