const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldEffect = `  useEffect(() => {
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

const newEffect = `  const sidebarRef = React.useRef<HTMLElement>(null);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sidebarRef.current) return;
      const sidebarLeft = sidebarRef.current.getBoundingClientRect().left;
      const newWidth = Math.max(200, Math.min(e.clientX - sidebarLeft, 600));
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

content = content.replace(oldEffect, newEffect);

content = content.replace(`<aside className="bg-slate-50 border-r border-slate-200 flex flex-col z-10 flex-shrink-0 relative transition-none select-none" style={{ width: sidebarWidth }}>`, 
`<aside ref={sidebarRef} className="bg-slate-50 border-r border-slate-200 flex flex-col z-10 flex-shrink-0 relative transition-none select-none" style={{ width: sidebarWidth }}>`);

fs.writeFileSync(file, content);
console.log("Updated drag to be precise");
