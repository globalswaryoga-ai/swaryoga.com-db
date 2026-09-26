import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# 1. Add columnOrder state
state_injection = """  const [crmFields, setCrmFields] = useState<{id: string, label: string}[]>([
    {id: 'Name', label: 'NAME'},
    {id: 'Email', label: 'EMAIL'},
    {id: 'Mobile', label: 'MOBILE'},
    {id: 'City', label: 'CITY'},
    {id: 'Country', label: 'COUNTRY'},
    {id: 'Gender', label: 'GENDER'}
  ]);
  
  const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'whatsapp', 'email', 'gender', 'city', 'payment', 'submittedAt']);"""

content = content.replace("  const [crmFields, setCrmFields] = useState<{id: string, label: string}[]>([\n    {id: 'Name', label: 'NAME'},\n    {id: 'Email', label: 'EMAIL'},\n    {id: 'Mobile', label: 'MOBILE'},\n    {id: 'City', label: 'CITY'},\n    {id: 'Country', label: 'COUNTRY'},\n    {id: 'Gender', label: 'GENDER'}\n  ]);", state_injection)

# 2. Before the table renders, compute activeColumns
render_logic = """                      <div className="flex-1 overflow-x-auto min-h-[500px] bg-white relative">
                        {(() => {
                          const allAvailableColumns = ['name', 'whatsapp', 'email', 'gender', 'city', 'payment', 'submittedAt', ...(showDynamicColumns ? dynamicColumns : [])];
                          let activeColumns = columnOrder.filter(c => allAvailableColumns.includes(c));
                          allAvailableColumns.forEach(c => {
                            if (!activeColumns.includes(c)) activeColumns.push(c);
                          });

                          const moveColumn = (colId: string, direction: 'left' | 'right') => {
                            const idx = activeColumns.indexOf(colId);
                            if (idx < 0) return;
                            if (direction === 'left' && idx > 0) {
                              const newOrder = [...activeColumns];
                              [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                              setColumnOrder(newOrder);
                            } else if (direction === 'right' && idx < activeColumns.length - 1) {
                              const newOrder = [...activeColumns];
                              [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                              setColumnOrder(newOrder);
                            }
                          };

                          return (
                            <table className="w-full text-left text-sm text-slate-600">"""

content = content.replace('                      <div className="flex-1 overflow-x-auto min-h-[500px] bg-white relative">\n                        <table className="w-full text-left text-sm text-slate-600">', render_logic)

# 3. Replace the <thead>
thead_old = """                        <thead className="bg-slate-50 sticky top-0 z-30 border-b border-slate-200 uppercase text-xs shadow-sm">
                          <tr>
                            <th className="px-4 py-3 font-bold text-slate-500 text-center w-[50px] min-w-[50px] sticky left-0 z-30 bg-slate-50">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={filteredLeads.length > 0 && selectedRowIds.length === filteredLeads.length}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedRowIds(filteredLeads.map(l => l.id));
                                  else setSelectedRowIds([]);
                                }}
                              />
                            </th>
                            <th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[50px] z-30 bg-slate-50">Name</th>
                            <th className="px-4 py-3 font-bold text-slate-500 w-[110px] min-w-[110px] sticky left-[200px] z-30 bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">WhatsApp</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Email</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Gender</th>
                            <th className="px-4 py-3 font-bold text-slate-500">City</th>
                            {showDynamicColumns && dynamicColumns.map(col => (
                              <th key={col} className="px-4 py-3 font-bold text-slate-500 whitespace-normal min-w-[100px] max-w-[150px] break-words leading-tight">
                                <div className="line-clamp-4" title={col}>{col}</div>
                              </th>
                            ))}
                            <th className="px-4 py-3 font-bold text-slate-500">Payment</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Submitted At</th>
                            <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                          </tr>
                        </thead>"""

thead_new = """                        <thead className="bg-slate-50 sticky top-0 z-30 border-b border-slate-200 uppercase text-xs shadow-sm">
                          <tr>
                            <th className="px-4 py-3 font-bold text-slate-500 text-center w-[50px] min-w-[50px] sticky left-0 z-30 bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={filteredLeads.length > 0 && selectedRowIds.length === filteredLeads.length}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedRowIds(filteredLeads.map(l => l.id));
                                  else setSelectedRowIds([]);
                                }}
                              />
                            </th>
                            {activeColumns.map((col, idx) => {
                              let label = col;
                              let wClass = '';
                              if (col === 'name') { label = 'Name'; wClass = 'w-[150px] min-w-[150px]'; }
                              else if (col === 'whatsapp') { label = 'WhatsApp'; wClass = 'w-[110px] min-w-[110px] max-w-[120px]'; } // Reduced whatsapp space
                              else if (col === 'email') { label = 'Email'; }
                              else if (col === 'gender') { label = 'Gender'; }
                              else if (col === 'city') { label = 'City'; }
                              else if (col === 'payment') { label = 'Payment'; }
                              else if (col === 'submittedAt') { label = 'Submitted At'; }
                              
                              return (
                                <th key={col} className={`px-4 py-3 font-bold text-slate-500 group relative ${wClass}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="truncate">{label}</span>
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center bg-slate-100 rounded px-1 -ml-1 transition-opacity">
                                      <button onClick={() => moveColumn(col, 'left')} className="p-0.5 hover:text-indigo-600" disabled={idx === 0}>‹</button>
                                      <button onClick={() => moveColumn(col, 'right')} className="p-0.5 hover:text-indigo-600" disabled={idx === activeColumns.length - 1}>›</button>
                                    </div>
                                  </div>
                                </th>
                              );
                            })}
                            <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                          </tr>
                        </thead>"""

content = content.replace(thead_old, thead_new)

# 4. Replace the <tbody> cells
tbody_start = """                              return (
                                <tr key={lead.id || i} className={`group transition-colors ${baseBgClass}`}>
                                  <td className={`px-4 py-3 text-center w-[50px] min-w-[50px] sticky left-0 z-20 ${cellBgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedRowIds(prev => [...prev, lead.id]);
                                        else setSelectedRowIds(prev => prev.filter(id => id !== lead.id));
                                      }}
                                    />
                                  </td>"""

tbody_cells_old = """                                  <td className={`px-4 py-3 font-medium text-slate-800 whitespace-nowrap w-[150px] min-w-[150px] sticky left-[50px] z-20 ${cellBgClass} transition-colors`}>
                                    <div className="truncate w-full">{lead.name || '-'}</div>
                                  </td>
                                  <td className={`px-4 py-3 whitespace-nowrap w-[110px] min-w-[110px] sticky left-[200px] z-20 ${cellBgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                    {lead.mobile || lead.phoneNumber || '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">{lead.email || '-'}</td>
                                  <td className="px-4 py-3 capitalize whitespace-nowrap">{lead.gender || '-'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">{lead.city || '-'}</td>
                                  {showDynamicColumns && dynamicColumns.map(col => (
                                    <td key={col} className="px-4 py-3 whitespace-normal min-w-[100px] max-w-[150px] break-words text-slate-500 text-xs">
                                      {lead.dynamicAnswers?.[col] || '-'}
                                    </td>
                                  ))}
                                  <td className="px-4 py-3">
                                    {lead.payment?.status ? (
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lead.payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {lead.payment.status}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">{lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString() : '-'}</td>"""

tbody_cells_new = """                                  {activeColumns.map(col => {
                                    if (col === 'name') {
                                      return (
                                        <td key={col} className={`px-4 py-3 font-medium text-slate-800 whitespace-nowrap w-[150px] min-w-[150px] ${cellBgClass} transition-colors`}>
                                          <div className="truncate w-full max-w-[140px]" title={lead.name || ''}>{lead.name || '-'}</div>
                                        </td>
                                      );
                                    } else if (col === 'whatsapp') {
                                      return (
                                        <td key={col} className={`px-4 py-3 whitespace-nowrap w-[110px] min-w-[110px] max-w-[120px] ${cellBgClass} transition-colors`}>
                                          <div className="truncate w-full max-w-[110px]" title={lead.mobile || lead.phoneNumber || ''}>{lead.mobile || lead.phoneNumber || '-'}</div>
                                        </td>
                                      );
                                    } else if (col === 'email') {
                                      return <td key={col} className={`px-4 py-3 whitespace-nowrap max-w-[180px] ${cellBgClass}`}><div className="truncate w-full" title={lead.email || ''}>{lead.email || '-'}</div></td>;
                                    } else if (col === 'gender') {
                                      return <td key={col} className={`px-4 py-3 capitalize whitespace-nowrap ${cellBgClass}`}>{lead.gender || '-'}</td>;
                                    } else if (col === 'city') {
                                      return <td key={col} className={`px-4 py-3 whitespace-nowrap max-w-[120px] ${cellBgClass}`}><div className="truncate w-full" title={lead.city || ''}>{lead.city || '-'}</div></td>;
                                    } else if (col === 'payment') {
                                      return (
                                        <td key={col} className={`px-4 py-3 ${cellBgClass}`}>
                                          {lead.payment?.status ? (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lead.payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                              {lead.payment.status}
                                            </span>
                                          ) : '-'}
                                        </td>
                                      );
                                    } else if (col === 'submittedAt') {
                                      return <td key={col} className={`px-4 py-3 whitespace-nowrap ${cellBgClass}`}>{lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString() : '-'}</td>;
                                    } else {
                                      return (
                                        <td key={col} className={`px-4 py-3 whitespace-normal min-w-[100px] max-w-[150px] break-words text-slate-500 text-xs ${cellBgClass}`}>
                                          <div className="line-clamp-2" title={lead.dynamicAnswers?.[col]}>{lead.dynamicAnswers?.[col] || '-'}</div>
                                        </td>
                                      );
                                    }
                                  })}"""

# Note: The sticky left-[50px] and sticky left-[200px] on the <tbody> cells for Name and WhatsApp were removed since they are no longer sticky.
# Also added a shadow to the Checkbox sticky col to indicate scroll.

# Fix the tbody cells
content = content.replace(tbody_cells_old, tbody_cells_new)

# 5. Fix the wrapper close
content = content.replace('                          </tbody>\n                        </table>\n                      </div>\n', '                          </tbody>\n                        </table>\n                        })()}\n                      </div>\n')

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
