const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/new-registration/page.tsx', 'utf8');

// 1. Insert helpers
const helperCode = `
                            const ResizableThT2 = ({ colKey, label, baseWidth, stickyClass = '', zIndex = '' }: { colKey: string, label: React.ReactNode, baseWidth: number, stickyClass?: string, zIndex?: string }) => {
                              const width = colWidths[\`t2_\${colKey}\`] || baseWidth;
                              return (
                                <th style={{ width: \`\${width}px\`, minWidth: \`\${width}px\`, maxWidth: \`\${width}px\` }} className={\`px-4 py-3 font-bold text-slate-500 relative group \${stickyClass} \${zIndex}\`}>
                                  <div className="line-clamp-4">{label}</div>
                                  <div className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors" onMouseDown={(e) => {
                                      e.preventDefault();
                                      const startX = e.pageX;
                                      const onMouseMove = (moveEvent: MouseEvent) => {
                                        setColWidths(prev => ({ ...prev, [\`t2_\${colKey}\`]: Math.max(50, width + moveEvent.pageX - startX) }));
                                      };
                                      const onMouseUp = () => {
                                        document.removeEventListener('mousemove', onMouseMove);
                                        document.removeEventListener('mouseup', onMouseUp);
                                      };
                                      document.addEventListener('mousemove', onMouseMove);
                                      document.addEventListener('mouseup', onMouseUp);
                                  }} />
                                </th>
                              );
                            };
                            
                            const EditableTdT2 = ({ lead, colKey, initialVal, baseWidth, stickyClass = '', zIndex = '', isDynamic = false }: { lead: any, colKey: string, initialVal: string, baseWidth: number, stickyClass?: string, zIndex?: string, isDynamic?: boolean }) => {
                              const width = colWidths[\`t2_\${colKey}\`] || baseWidth;
                              return (
                                <td style={{ width: \`\${width}px\`, minWidth: \`\${width}px\`, maxWidth: \`\${width}px\` }} className={\`px-4 py-3 whitespace-normal break-words text-slate-800 \${stickyClass} \${zIndex}\`}>
                                  <div 
                                    className="line-clamp-4 w-full outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1 -mx-1" 
                                    title={initialVal}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      const newValue = e.currentTarget.textContent || '';
                                      if (newValue !== initialVal && newValue !== '-') {
                                        setLeadsData(prev => prev.map(l => {
                                          if (l.id === lead.id) {
                                            const updated = { ...l };
                                            if (colKey === 'name') updated.name = newValue;
                                            else if (colKey === 'whatsapp') { updated.mobile = newValue; updated.phoneNumber = newValue; }
                                            else if (colKey === 'email') updated.email = newValue;
                                            else if (colKey === 'gender') updated.gender = newValue;
                                            else if (colKey === 'age') updated.age = newValue;
                                            else if (colKey === 'city') updated.city = newValue;
                                            else if (colKey === 'country') updated.country = newValue;
                                            else if (isDynamic) {
                                              if (updated.dynamicAnswers && colKey in updated.dynamicAnswers) updated.dynamicAnswers = { ...updated.dynamicAnswers, [colKey]: newValue };
                                              if (updated._rawRecord) updated._rawRecord = { ...updated._rawRecord, [colKey]: newValue };
                                            }
                                            return updated;
                                          }
                                          return l;
                                        }));
                                      }
                                    }}
                                  >{initialVal}</div>
                                </td>
                              );
                            };
                            
                            return (
`;
code = code.replace(/                            return \(\n\s*<table className="min-w-full text-left text-sm text-slate-600">/g, helperCode + '                              <table className="min-w-full text-left text-sm text-slate-600" style={{ tableLayout: \'fixed\' }}>');

// 2. Replace static headers
code = code.replace(/<th className="px-4 py-3 font-bold text-slate-500 w-\[150px\] min-w-\[150px\] sticky left-\[50px\] z-30 bg-slate-50">Name<\/th>/g, 
  `<ResizableThT2 colKey="name" label="Name" baseWidth={150} stickyClass="sticky left-[50px] bg-slate-50" zIndex="z-30" />`);
code = code.replace(/<th className="px-4 py-3 font-bold text-slate-500 w-\[110px\] min-w-\[110px\] sticky left-\[200px\] z-30 bg-slate-50 shadow-\[4px_0_10px_-4px_rgba\(0,0,0,0.1\)\]">WhatsApp<\/th>/g,
  `<ResizableThT2 colKey="whatsapp" label="WhatsApp" baseWidth={110} stickyClass="sticky left-[200px] bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]" zIndex="z-30" />`);
code = code.replace(/<th className="px-4 py-3 font-bold text-slate-500 w-\[200px\] min-w-\[200px\]">Email<\/th>/g,
  `<ResizableThT2 colKey="email" label="Email" baseWidth={200} />`);
code = code.replace(/<th className="px-4 py-3 font-bold text-slate-500 min-w-\[100px\]">Gender<\/th>/g,
  `<ResizableThT2 colKey="gender" label="Gender" baseWidth={100} />`);
code = code.replace(/<th className="px-4 py-3 font-bold text-slate-500 min-w-\[100px\]">Age<\/th>/g,
  `<ResizableThT2 colKey="age" label="Age" baseWidth={100} />`);
code = code.replace(/<th className="px-4 py-3 font-bold text-slate-500 min-w-\[150px\]">City<\/th>/g,
  `<ResizableThT2 colKey="city" label="City" baseWidth={150} />`);
code = code.replace(/<th className="px-4 py-3 font-bold text-slate-500 min-w-\[150px\]">Country<\/th>/g,
  `<ResizableThT2 colKey="country" label="Country" baseWidth={150} />`);

// Replace dynamic headers using regex carefully
const dynHeadRegex = /\{showDynamicColumns && dynamicColumns\.map\(col => \{\s*const width = colWidths\[\`t2_\$\{col\}\`\] \|\| 150;\s*return \(\s*<th.*?<\/th>\s*\)\}\)\}/s;
code = code.replace(dynHeadRegex, `{showDynamicColumns && dynamicColumns.map(col => <ResizableThT2 key={col} colKey={col} label={col} baseWidth={150} />)}`);

// Replace body cells
code = code.replace(/<td className={`px-4 py-3 font-medium text-slate-800 whitespace-nowrap w-\[150px\] min-w-\[150px\] sticky left-\[50px\] z-20 \${bgClass} transition-colors`}>\s*<div className="truncate w-full" title=\{lead\.name\}>\{lead\.name \|\| '-'}<\/div>\s*<\/td>/g,
  `<EditableTdT2 lead={lead} colKey="name" initialVal={lead.name || '-'} baseWidth={150} stickyClass={\`sticky left-[50px] \${bgClass} transition-colors\`} zIndex="z-20" />`);

code = code.replace(/<td className={`px-4 py-3 whitespace-nowrap w-\[110px\] min-w-\[110px\] sticky left-\[200px\] z-20 \${bgClass} transition-colors shadow-\[4px_0_10px_-4px_rgba\(0,0,0,0.1\)\]`}>\s*<div className="truncate w-full" title=\{lead\.mobile \|\| lead\.phoneNumber\}>\{lead\.mobile \|\| lead\.phoneNumber \|\| '-'}<\/div>\s*<\/td>/g,
  `<EditableTdT2 lead={lead} colKey="whatsapp" initialVal={lead.mobile || lead.phoneNumber || '-'} baseWidth={110} stickyClass={\`sticky left-[200px] \${bgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]\`} zIndex="z-20" />`);

code = code.replace(/<td className={`px-4 py-3 whitespace-nowrap w-\[200px\] min-w-\[200px\] \${bgClass} transition-colors`}>\s*<div className="truncate w-full" title=\{lead\.email\}>\{lead\.email \|\| '-'}<\/div>\s*<\/td>/g,
  `<EditableTdT2 lead={lead} colKey="email" initialVal={lead.email || '-'} baseWidth={200} stickyClass={\`\${bgClass} transition-colors\`} />`);

code = code.replace(/<td className={`px-4 py-3 capitalize whitespace-nowrap \${bgClass} transition-colors`}>\{lead\.gender \|\| '-'}<\/td>/g,
  `<EditableTdT2 lead={lead} colKey="gender" initialVal={lead.gender || '-'} baseWidth={100} stickyClass={\`capitalize \${bgClass} transition-colors\`} />`);

code = code.replace(/<td className={`px-4 py-3 whitespace-nowrap \${bgClass} transition-colors`}>\{lead\.age \|\| '-'}<\/td>/g,
  `<EditableTdT2 lead={lead} colKey="age" initialVal={String(lead.age || '-')} baseWidth={100} stickyClass={\`\${bgClass} transition-colors\`} />`);

code = code.replace(/<td className={`px-4 py-3 whitespace-nowrap \${bgClass} transition-colors`}>\s*<div className="truncate w-full max-w-\[150px\]" title=\{lead\.city\}>\{lead\.city \|\| '-'}<\/div>\s*<\/td>/g,
  `<EditableTdT2 lead={lead} colKey="city" initialVal={lead.city || '-'} baseWidth={150} stickyClass={\`\${bgClass} transition-colors\`} />`);

code = code.replace(/<td className={`px-4 py-3 whitespace-nowrap \${bgClass} transition-colors`}>\s*<div className="truncate w-full max-w-\[150px\]" title=\{lead\.country\}>\{lead\.country \|\| '-'}<\/div>\s*<\/td>/g,
  `<EditableTdT2 lead={lead} colKey="country" initialVal={lead.country || '-'} baseWidth={150} stickyClass={\`\${bgClass} transition-colors\`} />`);

// Replace dynamic body cells
const dynBodyRegex = /\{showDynamicColumns && dynamicColumns\.map\(col => \{\s*const val = .*?<\/td>\s*\)\}\)\}/s;
code = code.replace(dynBodyRegex, `{showDynamicColumns && dynamicColumns.map(col => <EditableTdT2 key={col} lead={lead} colKey={col} initialVal={(lead.dynamicAnswers && lead.dynamicAnswers[col]) || (lead._rawRecord && lead._rawRecord[col]) || '-'} baseWidth={150} isDynamic={true} stickyClass={\`text-xs \${bgClass} transition-colors\`} />)}`);

fs.writeFileSync('app/admin/crm/new-registration/page.tsx', code);
console.log('Patched correctly!');
