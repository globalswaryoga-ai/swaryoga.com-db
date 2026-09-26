import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# 1. Add states
state_old = "  const [rowDensity, setRowDensity] = useState<'compact'|'normal'|'comfortable'>('compact');"
state_new = """  const [rowDensity, setRowDensity] = useState<'compact'|'normal'|'comfortable'>('compact');
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});"""
content = content.replace(state_old, state_new)

# 2. Add handlers before the table return
table_start_old = """                          const moveColumn = (colId: string, direction: 'left' | 'right') => {
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

table_start_new = """                          const moveColumn = (colId: string, direction: 'left' | 'right') => {
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

                          const handleColResize = (e: React.MouseEvent, colId: string, currentWidth: number) => {
                            e.preventDefault();
                            const startX = e.pageX;
                            const onMouseMove = (moveEvent: MouseEvent) => {
                              setColWidths(prev => ({ ...prev, [colId]: Math.max(50, currentWidth + moveEvent.pageX - startX) }));
                            };
                            const onMouseUp = () => {
                              document.removeEventListener('mousemove', onMouseMove);
                              document.removeEventListener('mouseup', onMouseUp);
                            };
                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                          };

                          const handleRowResize = (e: React.MouseEvent, rowId: string, currentHeight: number) => {
                            e.preventDefault();
                            const startY = e.pageY;
                            const onMouseMove = (moveEvent: MouseEvent) => {
                              setRowHeights(prev => ({ ...prev, [rowId]: Math.max(30, currentHeight + moveEvent.pageY - startY) }));
                            };
                            const onMouseUp = () => {
                              document.removeEventListener('mousemove', onMouseMove);
                              document.removeEventListener('mouseup', onMouseUp);
                            };
                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                          };

                          return (
                            <table className="w-full text-left text-sm text-slate-600" style={{ tableLayout: 'fixed' }}>"""
content = content.replace(table_start_old, table_start_new)

# 3. Modify th to support resizing
th_old = """                            {activeColumns.map((col, idx) => {
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
                            })}"""

th_new = """                            {activeColumns.map((col, idx) => {
                              let label = col;
                              let baseWidth = 150;
                              if (col === 'whatsapp') baseWidth = 120;
                              else if (col === 'email') baseWidth = 180;
                              else if (col === 'city' || col === 'gender') baseWidth = 120;
                              else if (col === 'payment' || col === 'submittedAt') baseWidth = 120;
                              
                              const width = colWidths[col] || baseWidth;
                              
                              if (col === 'name') { label = 'Name'; }
                              else if (col === 'whatsapp') { label = 'WhatsApp'; }
                              else if (col === 'email') { label = 'Email'; }
                              else if (col === 'gender') { label = 'Gender'; }
                              else if (col === 'city') { label = 'City'; }
                              else if (col === 'payment') { label = 'Payment'; }
                              else if (col === 'submittedAt') { label = 'Submitted At'; }
                              
                              return (
                                <th key={col} style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }} className={`px-4 py-3 font-bold text-slate-500 group relative`}>
                                  <div className="flex items-center gap-2">
                                    <span className="truncate">{label}</span>
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center bg-slate-100 rounded px-1 -ml-1 transition-opacity">
                                      <button onClick={() => moveColumn(col, 'left')} className="p-0.5 hover:text-indigo-600" disabled={idx === 0}>‹</button>
                                      <button onClick={() => moveColumn(col, 'right')} className="p-0.5 hover:text-indigo-600" disabled={idx === activeColumns.length - 1}>›</button>
                                    </div>
                                  </div>
                                  <div 
                                    className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors"
                                    onMouseDown={(e) => handleColResize(e, col, width)}
                                  />
                                </th>
                              );
                            })}"""
content = content.replace(th_old, th_new)

# 4. Modify row to support resizing and use column widths
row_old_1 = """                              return (
                                <tr key={lead.id || i} className={`group transition-colors ${baseBgClass}`}>"""
row_new_1 = """                              const height = rowHeights[lead.id] || (rowDensity === 'compact' ? 40 : rowDensity === 'normal' ? 56 : 72);
                              return (
                                <tr key={lead.id || i} style={{ height: `${height}px` }} className={`group transition-colors relative ${baseBgClass}`}>"""
content = content.replace(row_old_1, row_new_1)

# Now apply column widths to TDs
# Using regex to replace the complex TD structure
import re

# We need to add the resizer at the end of the row (or inside the first td to resize the whole row)
# Actually, better to put a row resizer at the bottom of the first td (checkbox td)
td_checkbox_old = """                                  <td className={`${spacingClass} text-center w-[50px] min-w-[50px] sticky left-0 z-20 ${cellBgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
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
td_checkbox_new = """                                  <td className={`${spacingClass} text-center w-[50px] min-w-[50px] sticky left-0 z-20 ${cellBgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] relative`}>
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedRowIds(prev => [...prev, lead.id]);
                                        else setSelectedRowIds(prev => prev.filter(id => id !== lead.id));
                                      }}
                                    />
                                    <div 
                                      className="absolute left-0 right-0 bottom-0 h-1 hover:h-2 bg-transparent hover:bg-indigo-400 cursor-row-resize z-50 transition-colors"
                                      onMouseDown={(e) => handleRowResize(e, lead.id, height)}
                                    />
                                  </td>"""
content = content.replace(td_checkbox_old, td_checkbox_new)

# Since we use `tableLayout: 'fixed'`, the column widths set on `th` will automatically apply to the entire column. 
# So we don't necessarily need to set width styles on all `td`s, BUT our `td`s currently have explicit widths like `w-[150px]` which will override the table layout!
# We must remove the explicit widths from the `td`s.

tds_old = """                                  {activeColumns.map(col => {
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
                                  })}"""

tds_new = """                                  {activeColumns.map(col => {
                                    if (col === 'name') {
                                      return (
                                        <td key={col} className={`${spacingClass} font-medium text-slate-800 whitespace-nowrap overflow-hidden ${cellBgClass} transition-colors`}>
                                          <div className="truncate w-full" title={lead.name || ''}>{lead.name || '-'}</div>
                                        </td>
                                      );
                                    } else if (col === 'whatsapp') {
                                      return (
                                        <td key={col} className={`${spacingClass} whitespace-nowrap overflow-hidden ${cellBgClass} transition-colors`}>
                                          <div className="truncate w-full" title={lead.mobile || lead.phoneNumber || ''}>{lead.mobile || lead.phoneNumber || '-'}</div>
                                        </td>
                                      );
                                    } else if (col === 'email') {
                                      return <td key={col} className={`${spacingClass} whitespace-nowrap overflow-hidden ${cellBgClass}`}><div className="truncate w-full" title={lead.email || ''}>{lead.email || '-'}</div></td>;
                                    } else if (col === 'gender') {
                                      return <td key={col} className={`${spacingClass} capitalize whitespace-nowrap overflow-hidden ${cellBgClass}`}>{lead.gender || '-'}</td>;
                                    } else if (col === 'city') {
                                      return <td key={col} className={`${spacingClass} whitespace-nowrap overflow-hidden ${cellBgClass}`}><div className="truncate w-full" title={lead.city || ''}>{lead.city || '-'}</div></td>;
                                    } else if (col === 'payment') {
                                      return (
                                        <td key={col} className={`${spacingClass} overflow-hidden ${cellBgClass}`}>
                                          {lead.payment?.status ? (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lead.payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                              {lead.payment.status}
                                            </span>
                                          ) : '-'}
                                        </td>
                                      );
                                    } else if (col === 'submittedAt') {
                                      return <td key={col} className={`${spacingClass} whitespace-nowrap overflow-hidden ${cellBgClass}`}>{lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString() : '-'}</td>;
                                    } else {
                                      return (
                                        <td key={col} className={`${spacingClass} whitespace-normal break-words overflow-hidden text-slate-500 text-xs ${cellBgClass}`}>
                                          <div className="line-clamp-2" title={lead.dynamicAnswers?.[col]}>{lead.dynamicAnswers?.[col] || '-'}</div>
                                        </td>
                                      );
                                    }
                                  })}"""
content = content.replace(tds_old, tds_new)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)

