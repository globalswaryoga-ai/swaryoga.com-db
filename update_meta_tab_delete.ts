import fs from 'fs';
const file = 'app/admin/crm/new-registration/_MetaLeadsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("const [selectedLeads, setSelectedLeads] = useState<string[]>([]);")) {
    code = code.replace(
        "const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);",
        "const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);\n    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);"
    );
}

if (!code.includes("import { Save, Facebook, Download, RefreshCw, Bot, Trash2 } from 'lucide-react';")) {
    code = code.replace(
        "import { Save, Facebook, Download, RefreshCw, Bot } from 'lucide-react';",
        "import { Save, Facebook, Download, RefreshCw, Bot, Trash2 } from 'lucide-react';"
    );
}

const deleteLogic = `
    const handleDelete = async (ids: string[]) => {
        if (!confirm(\`Are you sure you want to delete \${ids.length} lead(s)? This cannot be undone.\`)) return;
        try {
            const res = await fetch('/api/admin/crm/meta-leads/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            if (res.ok) {
                alert('Deleted successfully. Please refresh the page to see changes.');
                setSelectedLeads([]);
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };
`;

if (!code.includes("const handleDelete")) {
    code = code.replace("const handleConnect = () => {", deleteLogic + "\n    const handleConnect = () => {");
}

const bulkDeleteUi = `
                    <div className="pt-5 flex items-center gap-2">
                        {selectedLeads.length > 0 && (
                            <button 
                                onClick={() => handleDelete(selectedLeads)}
                                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm border border-red-200"
                            >
                                <Trash2 size={16} />
                                Delete Selected ({selectedLeads.length})
                            </button>
                        )}
`;

code = code.replace('<div className="pt-5 flex items-center gap-2">', bulkDeleteUi);

const tableHeader = `
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={metaLeads.length > 0 && selectedLeads.length === metaLeads.length}
                                    onChange={(e) => setSelectedLeads(e.target.checked ? metaLeads.map((l: any) => l.id || l._id) : [])}
                                />
                            </th>
                            <th className="px-4 py-3 whitespace-nowrap">SR.NO</th>
`;

code = code.replace(
`                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">SR.NO</th>`,
tableHeader
);

const tableRow = `
                        <tr key={lead.id || lead._id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedLeads.includes(lead.id || lead._id)}
                                    onChange={(e) => {
                                        const id = lead.id || lead._id;
                                        if (e.target.checked) setSelectedLeads([...selectedLeads, id]);
                                        else setSelectedLeads(selectedLeads.filter(lId => lId !== id));
                                    }}
                                />
                            </td>
                            <td className="px-4 py-3">{idx + 1}</td>
`;

code = code.replace(
`                        <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">{idx + 1}</td>`,
tableRow
);

const actionTd = `
                            {dynamicColumns.map(col => {
                                const field = lead.metadata?.rawFieldData?.find((f: any) => f.name === col || f.question_text === col);
                                return (
                                    <td key={col} className="px-4 py-3 text-sm text-blue-700 whitespace-nowrap">
                                        {field?.values?.[0] || '-'}
                                    </td>
                                );
                            })}
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => handleDelete([lead.id || lead._id])} className="text-red-500 hover:text-red-700 p-1">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
`;

code = code.replace(
`                            {dynamicColumns.map(col => {
                                const field = lead.metadata?.rawFieldData?.find((f: any) => f.name === col || f.question_text === col);
                                return (
                                    <td key={col} className="px-4 py-3 text-sm text-blue-700 whitespace-nowrap">
                                        {field?.values?.[0] || '-'}
                                    </td>
                                );
                            })}
                        </tr>`,
actionTd
);

code = code.replace(
`                            {dynamicColumns.map(col => (
                                <th key={col} className="px-4 py-3 whitespace-nowrap text-blue-600">{col}</th>
                            ))}
                        </tr>`,
`                            {dynamicColumns.map(col => (
                                <th key={col} className="px-4 py-3 whitespace-nowrap text-blue-600">{col}</th>
                            ))}
                            <th className="px-4 py-3 whitespace-nowrap text-right">ACTIONS</th>
                        </tr>`
);


fs.writeFileSync(file, code);
