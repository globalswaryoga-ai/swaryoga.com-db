const fs = require('fs');
const file = 'app/admin/crm/workshop-offer/_LeadsManagementTab.tsx';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('customCategories')) {
  c = c.replace(
    /const SIDEBAR_TABS = \[/,
    `const DEFAULT_SIDEBAR_TABS = [`
  );

  c = c.replace(
    /\];[\s\n]*const LANGUAGES/,
    `];
    
const INITIAL_CUSTOM_CATEGORIES: any[] = []; // workshop-offer doesn't strictly need the initial ones, but we'll fetch from localStorage inside the component.

const LANGUAGES`
  );

  c = c.replace(
    /const \[batchDecisions, setBatchDecisions\] = useState<Record<string, any>>\(\(\) => \{/,
    `const [customCategories, setCustomCategories] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_custom_categories');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  
  const SIDEBAR_TABS = React.useMemo(() => [...DEFAULT_SIDEBAR_TABS, ...customCategories], [customCategories]);
  
  const getCategoryLabel = (id: string) => {
    const tab = SIDEBAR_TABS.find((t: any) => t.id === id);
    return tab ? tab.label : id.replace(/_/g, ' ');
  };

  const [batchDecisions, setBatchDecisions] = useState<Record<string, any>>(() => {`
  );

  c = c.replace(
    /\{leadStatus\.replace\(\/_\/g, ' '\)\}/g,
    `{getCategoryLabel(leadStatus)}`
  );

  fs.writeFileSync(file, c);
}
