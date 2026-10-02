const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldIcon = 'const TabIcon = tab.icon || Clock;';
const newIcon = `const TabIcon = typeof tab.icon === 'function' || (tab.icon && tab.icon.$$typeof) ? tab.icon : (
  tab.id.includes('pending') ? Clock :
  tab.id.includes('approval') ? CheckCircle :
  tab.id.includes('registered') ? UserCheck :
  tab.id.includes('set_zoom') ? Calendar :
  tab.id.includes('take_zoom') ? Video :
  tab.id.includes('rejected') ? XCircle :
  tab.id.includes('ai_triggers') ? Zap :
  tab.id.includes('new_leads') ? FileText : Clock
);`;

content = content.replace(oldIcon, newIcon);
fs.writeFileSync(file, content);
console.log("Updated TabIcon to fix serialization crash");
