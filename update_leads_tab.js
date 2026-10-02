const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove const SIDEBAR_TABS array and replace it with default tabs const
content = content.replace(/const SIDEBAR_TABS = \[[\s\S]*?\];/, `const DEFAULT_SIDEBAR_TABS = [
  { id: 'new_leads', label: 'New Leads', icon: FileText, isSystem: true },
  { id: 'pending_leads', label: 'Pending Leads', icon: Clock, isSystem: true },
  { id: 'pending_leads_1', label: 'Pending Leads-1', icon: Clock, isSystem: true },
  { id: 'pending_leads_2', label: 'Pending Leads-2', icon: Clock, isSystem: true },
  { id: 'pending_leads_3', label: 'Pending Leads-3', icon: Clock, isSystem: true },
  { id: 'approval_1', label: 'Aprovel-1', icon: CheckCircle, isSystem: true },
  { id: 'approval_2', label: 'Aprovel-2', icon: CheckCircle, isSystem: true },
  { id: 'registered_leads', label: 'Registerd leads', icon: UserCheck, isSystem: true },
  { id: 'set_zoom_meeting', label: 'Set zoom meeting', icon: Calendar, isSystem: true },
  { id: 'take_zoom_meeting', label: 'Take Zoom Meeting', icon: Video, isSystem: true },
  { id: 'rejected_leads', label: 'Rejected leads', icon: XCircle, isSystem: true },
  { id: 'ai_triggers', label: 'AI Triggers-WT', icon: Zap, isSystem: true },
];`);

// 2. Add state for custom categories inside LeadsManagementTab
const stateInjection = `
  const [customCategories, setCustomCategories] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_custom_categories');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  
  const SIDEBAR_TABS = React.useMemo(() => [...DEFAULT_SIDEBAR_TABS, ...customCategories], [customCategories]);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
`;
content = content.replace('const [selectedLeads, setSelectedLeads] = useState<string[]>([]);', `const [selectedLeads, setSelectedLeads] = useState<string[]>([]);\n${stateInjection}`);

// Write back
fs.writeFileSync(file, content);
console.log("Updated SIDEBAR_TABS to be dynamic.");
