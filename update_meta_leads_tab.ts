import fs from 'fs';
const file = 'app/admin/crm/new-registration/_MetaLeadsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const newImports = `
import React, { useState, useEffect, useRef } from 'react';
import { Save, Facebook, Download, RefreshCw, Bot } from 'lucide-react';
`;

code = code.replace("import React, { useState } from 'react';", newImports);
code = code.replace("import { Save, Facebook, Download } from 'lucide-react';", "");

const hookLogic = `
    const [isAutoSync, setIsAutoSync] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const syncLeads = async () => {
        if (!formId) return;
        setIsSyncing(true);
        try {
            const res = await fetch('/api/admin/crm/meta-leads/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formId, workshopId: selectedWorkshop?.id, workshopName: selectedWorkshop?.name })
            });
            const data = await res.json();
            if (data.success) {
                console.log('Synced', data.syncedCount, 'new leads');
                setLastSyncTime(new Date());
            } else {
                console.error('Sync failed', data.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        let interval: any;
        if (isAutoSync && formId) {
            syncLeads(); // Sync immediately on toggle
            interval = setInterval(syncLeads, 5 * 60 * 1000); // Every 5 minutes
        }
        return () => clearInterval(interval);
    }, [isAutoSync, formId]);
`;

code = code.replace("const handleConnect = () => {", hookLogic + "\n    const handleConnect = () => {");

const syncUi = `
                    <div className="pt-5 flex items-center gap-2">
                        <button 
                            onClick={handleConnect}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
                        >
                            <Save size={16} />
                            Connect Form
                        </button>
                        <button 
                            onClick={() => setIsAutoSync(!isAutoSync)}
                            className={\`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm \${isAutoSync ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}\`}
                        >
                            <Bot size={16} className={isAutoSync ? "text-emerald-500 animate-pulse" : ""} />
                            AI-9A Auto-Sync
                        </button>
                        {isSyncing && <RefreshCw size={16} className="text-blue-500 animate-spin ml-2" />}
                    </div>
`;

code = code.replace(
`<div className="pt-5">
                        <button 
                            onClick={handleConnect}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
                        >
                            <Save size={16} />
                            Connect Form
                        </button>
                    </div>`,
syncUi
);

fs.writeFileSync(file, code);
