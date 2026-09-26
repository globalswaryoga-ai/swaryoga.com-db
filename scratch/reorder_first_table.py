with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# 1. Update dynamicColumns useMemo to sort the priorities
dynamic_old = """  const dynamicColumns = useMemo(() => {
    const keys = new Set<string>();
    leadsData.forEach(lead => {
      if (lead.dynamicAnswers) {
        Object.keys(lead.dynamicAnswers).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [leadsData]);"""

dynamic_new = """  const dynamicColumns = useMemo(() => {
    const keys = new Set<string>();
    leadsData.forEach(lead => {
      if (lead.dynamicAnswers) {
        Object.keys(lead.dynamicAnswers).forEach(k => keys.add(k));
      }
    });
    const allKeys = Array.from(keys);
    
    // Sort logic to prioritize specific keywords
    const priority = (k: string) => {
      const lower = k.toLowerCase();
      if (lower.includes('workshop date') || lower.includes('workshop month') || lower.includes('which workshop')) return 1;
      if (lower.includes('14 day') || lower.includes('14-day') || lower.includes('ready to do')) return 2;
      if (lower.includes('video')) return 3;
      if (lower.includes('donation')) return 4;
      return 100;
    };
    
    allKeys.sort((a, b) => priority(a) - priority(b));
    return allKeys;
  }, [leadsData]);"""
content = content.replace(dynamic_old, dynamic_new)


# 2. Update the thead of the first table
thead_old = """                                <th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[50px] z-30 bg-slate-50">Name</th>
                                <th className="px-4 py-3 font-bold text-slate-500 w-[200px] min-w-[200px] sticky left-[200px] z-30 bg-slate-50">Email</th>
                                <th className="px-4 py-3 font-bold text-slate-500 w-[110px] min-w-[110px] sticky left-[400px] z-30 bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">WhatsApp</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Gender</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Age</th>
                                <th className="px-4 py-3 font-bold text-slate-500">City</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Country</th>
                                {showDynamicColumns && dynamicColumns.map(col => (
                                  <th key={col} className="px-4 py-3 font-bold text-slate-500 whitespace-normal min-w-[100px] max-w-[150px] break-words leading-tight">
                                    <div className="line-clamp-4" title={col}>{col}</div>
                                  </th>
                                ))}
                                <th className="px-4 py-3 font-bold text-slate-500">"""

thead_new = """                                <th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[50px] z-30 bg-slate-50">Name</th>
                                <th className="px-4 py-3 font-bold text-slate-500 w-[110px] min-w-[110px] sticky left-[200px] z-30 bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">WhatsApp</th>
                                {showDynamicColumns && dynamicColumns.map(col => (
                                  <th key={col} className="px-4 py-3 font-bold text-slate-500 whitespace-normal min-w-[150px] max-w-[200px] break-words leading-tight">
                                    <div className="line-clamp-4" title={col}>{col}</div>
                                  </th>
                                ))}
                                <th className="px-4 py-3 font-bold text-slate-500 w-[200px] min-w-[200px]">Email</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Gender</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Age</th>
                                <th className="px-4 py-3 font-bold text-slate-500">City</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Country</th>
                                <th className="px-4 py-3 font-bold text-slate-500">"""
content = content.replace(thead_old, thead_new)


# 3. Update the tbody of the first table
tbody_old = """                                      <td className={`px-4 py-3 font-medium text-slate-800 whitespace-nowrap w-[150px] min-w-[150px] sticky left-[50px] z-20 ${bgClass} transition-colors`}>
                                        <div className="truncate w-full">{lead.name || '-'}</div>
                                      </td>
                                      <td className={`px-4 py-3 whitespace-nowrap w-[200px] min-w-[200px] sticky left-[200px] z-20 ${bgClass} transition-colors`}>
                                        <div className="truncate w-full">{lead.email || '-'}</div>
                                      </td>
                                      <td className={`px-4 py-3 whitespace-nowrap w-[110px] min-w-[110px] sticky left-[400px] z-20 ${bgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                        {lead.mobile || lead.phoneNumber || '-'}
                                      </td>
                                      <td className="px-4 py-3 capitalize whitespace-nowrap">{lead.gender || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.age || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.city || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.country || '-'}</td>
                                    {showDynamicColumns && dynamicColumns.map(col => (
                                      <td key={col} className="px-4 py-3 whitespace-normal min-w-[100px] max-w-[150px] break-words text-slate-500 text-xs">
                                        {lead.dynamicAnswers?.[col] || '-'}
                                      </td>
                                    ))}"""

tbody_new = """                                      <td className={`px-4 py-3 font-medium text-slate-800 whitespace-nowrap w-[150px] min-w-[150px] sticky left-[50px] z-20 ${bgClass} transition-colors`}>
                                        <div className="truncate w-full" title={lead.name}>{lead.name || '-'}</div>
                                      </td>
                                      <td className={`px-4 py-3 whitespace-nowrap w-[110px] min-w-[110px] sticky left-[200px] z-20 ${bgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                        <div className="truncate w-full" title={lead.mobile || lead.phoneNumber}>{lead.mobile || lead.phoneNumber || '-'}</div>
                                      </td>
                                    {showDynamicColumns && dynamicColumns.map(col => (
                                      <td key={col} className="px-4 py-3 whitespace-normal min-w-[150px] max-w-[200px] break-words text-slate-500 text-xs">
                                        <div className="line-clamp-2" title={lead.dynamicAnswers?.[col]}>{lead.dynamicAnswers?.[col] || '-'}</div>
                                      </td>
                                    ))}
                                      <td className={`px-4 py-3 whitespace-nowrap w-[200px] min-w-[200px] ${bgClass} transition-colors`}>
                                        <div className="truncate w-full" title={lead.email}>{lead.email || '-'}</div>
                                      </td>
                                      <td className="px-4 py-3 capitalize whitespace-nowrap">{lead.gender || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.age || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.city || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.country || '-'}</td>"""
content = content.replace(tbody_old, tbody_new)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
