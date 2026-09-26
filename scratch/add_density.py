import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# 1. Add state variable
state_injection = """  const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'whatsapp', 'email', 'gender', 'city', 'payment', 'submittedAt']);
  const [rowDensity, setRowDensity] = useState<'compact'|'normal'|'comfortable'>('compact');"""
content = content.replace("  const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'whatsapp', 'email', 'gender', 'city', 'payment', 'submittedAt']);", state_injection)

# 2. Add toggle in UI
toggle_old = """                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                      <button 
                        onClick={() => setShowDynamicColumns(!showDynamicColumns)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${showDynamicColumns ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showDynamicColumns ? 'Hide Custom Answers' : 'Show Custom Answers'}
                      </button>
                    </div>"""
toggle_new = """                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                      <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button onClick={() => setRowDensity('compact')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${rowDensity === 'compact' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} title="Compact View">≡</button>
                        <button onClick={() => setRowDensity('normal')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${rowDensity === 'normal' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} title="Normal View">≣</button>
                      </div>
                      <button 
                        onClick={() => setShowDynamicColumns(!showDynamicColumns)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${showDynamicColumns ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showDynamicColumns ? 'Hide Custom Answers' : 'Show Custom Answers'}
                      </button>
                    </div>"""
content = content.replace(toggle_old, toggle_new)

# 3. Apply cellBgClass and padding dynamically
# First, let's find the table cells:
# We need to change cellBgClass calculation to include padding
bg_class_old = "let cellBgClass = 'bg-white group-hover:bg-slate-50';"
bg_class_new = """let cellBgClass = 'bg-white group-hover:bg-slate-50';
                              const pyClass = rowDensity === 'compact' ? 'py-1' : rowDensity === 'normal' ? 'py-3' : 'py-5';
                              const pxClass = rowDensity === 'compact' ? 'px-2' : rowDensity === 'normal' ? 'px-4' : 'px-6';
                              const textClass = rowDensity === 'compact' ? 'text-xs' : 'text-sm';
                              const spacingClass = `${pxClass} ${pyClass} ${textClass}`;
"""
content = content.replace(bg_class_old, bg_class_new)

# Now replace all px-4 py-3 with ${spacingClass}
# But ONLY inside the first table (which is where activeColumns is used).
# Let's do a regex replacement for activeColumns block

cells_old = """                                  <td className={`px-4 py-3 text-center w-[50px] min-w-[50px] sticky left-0 z-20 ${cellBgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedRowIds(prev => [...prev, lead.id]);
                                        else setSelectedRowIds(prev => prev.filter(id => id !== lead.id));
                                      }}
                                    />
                                  </td>
                                  {activeColumns.map(col => {
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
                                  })}
                                  <td className="px-4 py-3 whitespace-nowrap text-right">"""

cells_new = """                                  <td className={`${spacingClass} text-center w-[50px] min-w-[50px] sticky left-0 z-20 ${cellBgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedRowIds(prev => [...prev, lead.id]);
                                        else setSelectedRowIds(prev => prev.filter(id => id !== lead.id));
                                      }}
                                    />
                                  </td>
                                  {activeColumns.map(col => {
                                    if (col === 'name') {
                                      return (
                                        <td key={col} className={`${spacingClass} font-medium text-slate-800 whitespace-nowrap w-[150px] min-w-[150px] ${cellBgClass} transition-colors`}>
                                          <div className="truncate w-full max-w-[140px]" title={lead.name || ''}>{lead.name || '-'}</div>
                                        </td>
                                      );
                                    } else if (col === 'whatsapp') {
                                      return (
                                        <td key={col} className={`${spacingClass} whitespace-nowrap w-[110px] min-w-[110px] max-w-[120px] ${cellBgClass} transition-colors`}>
                                          <div className="truncate w-full max-w-[110px]" title={lead.mobile || lead.phoneNumber || ''}>{lead.mobile || lead.phoneNumber || '-'}</div>
                                        </td>
                                      );
                                    } else if (col === 'email') {
                                      return <td key={col} className={`${spacingClass} whitespace-nowrap max-w-[180px] ${cellBgClass}`}><div className="truncate w-full" title={lead.email || ''}>{lead.email || '-'}</div></td>;
                                    } else if (col === 'gender') {
                                      return <td key={col} className={`${spacingClass} capitalize whitespace-nowrap ${cellBgClass}`}>{lead.gender || '-'}</td>;
                                    } else if (col === 'city') {
                                      return <td key={col} className={`${spacingClass} whitespace-nowrap max-w-[120px] ${cellBgClass}`}><div className="truncate w-full" title={lead.city || ''}>{lead.city || '-'}</div></td>;
                                    } else if (col === 'payment') {
                                      return (
                                        <td key={col} className={`${spacingClass} ${cellBgClass}`}>
                                          {lead.payment?.status ? (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lead.payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                              {lead.payment.status}
                                            </span>
                                          ) : '-'}
                                        </td>
                                      );
                                    } else if (col === 'submittedAt') {
                                      return <td key={col} className={`${spacingClass} whitespace-nowrap ${cellBgClass}`}>{lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString() : '-'}</td>;
                                    } else {
                                      return (
                                        <td key={col} className={`${spacingClass} whitespace-normal min-w-[100px] max-w-[150px] break-words text-slate-500 text-xs ${cellBgClass}`}>
                                          <div className="line-clamp-2" title={lead.dynamicAnswers?.[col]}>{lead.dynamicAnswers?.[col] || '-'}</div>
                                        </td>
                                      );
                                    }
                                  })}
                                  <td className={`${spacingClass} whitespace-nowrap text-right`}>"""
content = content.replace(cells_old, cells_new)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
