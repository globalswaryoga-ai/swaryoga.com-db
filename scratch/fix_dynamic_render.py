with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

old_render = """                                    {showDynamicColumns && dynamicColumns.map(col => (
                                      <td key={col} className="px-4 py-3 whitespace-normal min-w-[150px] max-w-[200px] break-words text-slate-500 text-xs">
                                        <div className="line-clamp-2" title={lead.dynamicAnswers?.[col]}>{lead.dynamicAnswers?.[col] || '-'}</div>
                                      </td>
                                    ))}"""

new_render = """                                    {showDynamicColumns && dynamicColumns.map(col => {
                                      const val = (lead.dynamicAnswers && lead.dynamicAnswers[col]) || (lead._rawRecord && lead._rawRecord[col]) || '-';
                                      return (
                                      <td key={col} className="px-4 py-3 whitespace-normal min-w-[150px] max-w-[200px] break-words text-slate-500 text-xs">
                                        <div className="line-clamp-2" title={val}>{val}</div>
                                      </td>
                                    )})}"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print("Fixed render.")

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
