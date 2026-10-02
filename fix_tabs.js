const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update DEFAULT and INITIAL arrays
content = content.replace(/const DEFAULT_SIDEBAR_TABS = \[[\s\S]*?\];/, `const DEFAULT_SIDEBAR_TABS = [
  { id: 'new_leads', label: 'New Leads', icon: FileText, isSystem: true },
];`);

content = content.replace(/const INITIAL_CUSTOM_CATEGORIES = \[[\s\S]*?\];/, `const INITIAL_CUSTOM_CATEGORIES = [
  { id: 'pending_leads', label: 'Pending Leads', icon: Clock, isSystem: false },
  { id: 'pending_leads_1', label: 'Pending Leads-1', icon: Clock, isSystem: false },
  { id: 'pending_leads_2', label: 'Pending Leads-2', icon: Clock, isSystem: false },
  { id: 'pending_leads_3', label: 'Pending Leads-3', icon: Clock, isSystem: false },
  { id: 'approval_1', label: 'Aprovel-1', icon: CheckCircle, isSystem: false },
  { id: 'approval_2', label: 'Aprovel-2', icon: CheckCircle, isSystem: false },
  { id: 'registered_leads', label: 'Registerd leads', icon: UserCheck, isSystem: true },
  { id: 'set_zoom_meeting', label: 'Set zoom meeting', icon: Calendar, isSystem: true },
  { id: 'take_zoom_meeting', label: 'Take Zoom Meeting', icon: Video, isSystem: true },
  { id: 'rejected_leads', label: 'Rejected leads', icon: XCircle, isSystem: true },
  { id: 'ai_triggers', label: 'AI Triggers-WT', icon: Zap, isSystem: true },
];`);

// Fix state initializer to merge properly
const newState = `
  const [customCategories, setCustomCategories] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_custom_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all system tabs from INITIAL are present
        const missing = INITIAL_CUSTOM_CATEGORIES.filter(ic => !parsed.find((p: any) => p.id === ic.id));
        return [...parsed, ...missing];
      }
    }
    return INITIAL_CUSTOM_CATEGORIES;
  });
`;

content = content.replace(/const \[customCategories, setCustomCategories\] = useState<any\[\]>\(\(\) => \{[\s\S]*?\}\);/, newState.trim());

// Add move category methods
const moveMethods = `
  const moveCategory = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newCats = [...customCategories];
    if (direction === 'up' && index > 0) {
      [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
    }
    setCustomCategories(newCats);
    if (typeof window !== 'undefined') localStorage.setItem('crm_custom_categories', JSON.stringify(newCats));
  };
`;

content = content.replace('// Render the Category Modal', moveMethods + '\n  // Render the Category Modal');

// Add arrow buttons to UI
const oldButtonUi = `
                {isCustom && (
                  <div className={\`flex gap-1 ml-1 \${activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\`}>
                    <div onClick={(e) => { e.stopPropagation(); setEditingCategory(tab); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-indigo-700 hover:text-white rounded text-indigo-200 transition-colors cursor-pointer">
                      <Plus className="h-3 w-3" />
                    </div>
                    <div onClick={(e) => deleteCategory(tab.id, e)} className="p-1 hover:bg-red-500 hover:text-white rounded text-red-200 transition-colors cursor-pointer">
                      <Trash2 className="h-3 w-3" />
                    </div>
                  </div>
                )}
`;

const newButtonUi = `
                <div className={\`flex gap-0.5 ml-1 \${activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\`}>
                  {tab.id !== 'new_leads' && (
                    <>
                      <div onClick={(e) => moveCategory(customCategories.findIndex(c => c.id === tab.id), 'up', e)} className="p-1 hover:bg-slate-700 hover:text-white rounded text-slate-300 transition-colors cursor-pointer" title="Move Up">
                        <ChevronUp className="h-3 w-3" />
                      </div>
                      <div onClick={(e) => moveCategory(customCategories.findIndex(c => c.id === tab.id), 'down', e)} className="p-1 hover:bg-slate-700 hover:text-white rounded text-slate-300 transition-colors cursor-pointer" title="Move Down">
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </>
                  )}
                  {isCustom && (
                    <>
                      <div onClick={(e) => { e.stopPropagation(); setEditingCategory(tab); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-blue-700 hover:text-white rounded text-blue-200 transition-colors cursor-pointer">
                        <Plus className="h-3 w-3" />
                      </div>
                      <div onClick={(e) => deleteCategory(tab.id, e)} className="p-1 hover:bg-red-500 hover:text-white rounded text-red-200 transition-colors cursor-pointer">
                        <Trash2 className="h-3 w-3" />
                      </div>
                    </>
                  )}
                </div>
`;

content = content.replace(oldButtonUi.trim(), newButtonUi.trim());

// We need ChevronUp, ChevronDown imported from lucide-react. Let's make sure they are in the imports.
content = content.replace("import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle, Video, Copy, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Link as LinkIcon, X, Zap } from 'lucide-react';", "import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle, Video, Copy, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Link as LinkIcon, X, Zap, ChevronUp, ChevronDown } from 'lucide-react';");

fs.writeFileSync(file, content);
console.log("Updated to support ordering");
