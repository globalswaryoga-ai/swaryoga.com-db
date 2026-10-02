const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add sidebarWidth state
const stateInsert = `  const [activeTab, setActiveTab] = useState('new_leads');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = Math.max(200, Math.min(e.clientX - 260, 600)); // approximate offset
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);`;

content = content.replace(`  const [activeTab, setActiveTab] = useState('new_leads');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);`, stateInsert);

// 2. Change <aside>
const oldAside = `<aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-10 flex-shrink-0">`;
const newAside = `<aside className="bg-slate-50 border-r border-slate-200 flex flex-col z-10 flex-shrink-0 relative transition-none select-none" style={{ width: sidebarWidth }}>
        <div 
          className="absolute right-[-4px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 z-50 transition-colors"
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
        />`;

content = content.replace(oldAside, newAside);

fs.writeFileSync(file, content);
console.log("Added sidebar resize logic");
