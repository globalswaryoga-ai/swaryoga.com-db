with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

old_thead = """                            {columnOrder.map((col, idx) => {
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
                                      <button onClick={() => moveColumn(col, 'right')} className="p-0.5 hover:text-indigo-600" disabled={idx === columnOrder.length - 1}>›</button>
                                    </div>
                                  </div>
                                  <div 
                                    className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors"
                                    onMouseDown={(e) => handleColResize(e, col, width)}
                                  />
                                </th>
                              );
                            })}
                            <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>"""

new_thead = """                            {columnOrder.map((col, idx) => {
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
                                      <button onClick={() => moveColumn(col, 'right')} className="p-0.5 hover:text-indigo-600" disabled={idx === columnOrder.length - 1}>›</button>
                                    </div>
                                  </div>
                                  <div 
                                    className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors"
                                    onMouseDown={(e) => handleColResize(e, col, width)}
                                  />
                                </th>
                              );
                            })}
                            {showDynamicColumns && dynamicColumns.map(col => (
                              <th key={col} className="px-4 py-3 font-bold text-slate-500 whitespace-normal min-w-[150px] max-w-[200px] break-words leading-tight">
                                <div className="line-clamp-4" title={col}>{col}</div>
                              </th>
                            ))}
                            <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>"""

if old_thead in content:
    content = content.replace(old_thead, new_thead)
    print("Fixed thead.")
else:
    print("Old thead not found.")

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
