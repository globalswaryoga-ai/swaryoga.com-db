const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure Edit2 is imported
if (!content.includes('Edit2')) {
  content = content.replace("import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle, Video, Copy, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Link as LinkIcon, X, Zap, ChevronUp, ChevronDown } from 'lucide-react';", "import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle, Video, Copy, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Link as LinkIcon, X, Zap, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';");
}

// Replace the Edit button's Plus icon with Edit2
const searchStr = `<div onClick={(e) => { e.stopPropagation(); setEditingCategory(tab); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-blue-700 hover:text-white rounded text-blue-200 transition-colors cursor-pointer">
                        <Plus className="h-3 w-3" />
                      </div>`;
const replaceStr = `<div onClick={(e) => { e.stopPropagation(); setEditingCategory(tab); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-blue-700 hover:text-white rounded text-blue-200 transition-colors cursor-pointer" title="Edit">
                        <Edit2 className="h-3 w-3" />
                      </div>`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync(file, content);
console.log("Updated icons");
