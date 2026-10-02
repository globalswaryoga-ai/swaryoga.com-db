const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// The UI components for Category Management and AI Config
const customUI = `
  // Category Management Methods
  const saveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const label = formData.get('label') as string;
    const aiAssign = formData.get('aiAssign') as string;
    
    let newCats = [...customCategories];
    if (editingCategory?.id) {
      newCats = newCats.map(c => c.id === editingCategory.id ? { ...c, label, aiAssignment: aiAssign } : c);
    } else {
      newCats.push({
        id: 'custom_' + Date.now(),
        label,
        icon: Clock,
        isSystem: false,
        aiAssignment: aiAssign
      });
    }
    setCustomCategories(newCats);
    if (typeof window !== 'undefined') localStorage.setItem('crm_custom_categories', JSON.stringify(newCats));
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    toast.success('Category saved!');
  };

  const deleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this category?')) return;
    const newCats = customCategories.filter(c => c.id !== id);
    setCustomCategories(newCats);
    if (typeof window !== 'undefined') localStorage.setItem('crm_custom_categories', JSON.stringify(newCats));
    if (activeTab === id) setActiveTab('new_leads');
  };

  // Render the Category Modal
  const renderCategoryModal = () => {
    if (!isCategoryModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={saveCategory} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
              <input type="text" name="label" defaultValue={editingCategory?.label} required className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign AI (Optional)</label>
              <select name="aiAssign" defaultValue={editingCategory?.aiAssignment || ''} className="w-full p-2 border rounded-lg">
                <option value="">None</option>
                <option value="AI-4A">AI-4A</option>
                <option value="AI-4B">AI-4B</option>
                <option value="AI-4C">AI-4C</option>
                <option value="AI-4D">AI-4D</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  };
`;

// Insert the UI methods before the return statement of LeadsManagementTab
content = content.replace('return (', customUI + '\n  return (');

// Update the Sidebar to render custom categories
const sidebarReplacement = `
            {/* Sidebar Categories */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider px-3">Categories</h3>
                <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-gray-200 rounded text-gray-600">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {SIDEBAR_TABS.map(tab => {
                const TabIcon = tab.icon || Clock;
                const isSystem = tab.isSystem;
                const isCustom = !isSystem;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={\`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }\`}
                  >
                    <div className="flex items-center gap-3">
                      <TabIcon className={\`h-4 w-4 \${activeTab === tab.id ? 'text-indigo-200' : 'text-gray-400'}\`} />
                      {tab.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={\`text-xs px-2 py-0.5 rounded-full \${
                        activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'
                      }\`}>
                        {tabCounts[tab.id] || 0}
                      </span>
                      {isCustom && activeTab === tab.id && (
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingCategory(tab); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-indigo-700 rounded text-white">
                            <Plus className="h-3 w-3" />
                          </button>
                          <button onClick={(e) => deleteCategory(tab.id, e)} className="p-1 hover:bg-indigo-700 rounded text-red-200">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
`;

content = content.replace(/<div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">[\s\S]*?(?=<div className="p-4 border-t border-gray-200 bg-white">)/, sidebarReplacement);

// Render Category Modal
content = content.replace('{activeModal && (', '{renderCategoryModal()}\n      {activeModal && (');

fs.writeFileSync(file, content);
console.log("Injected UI for custom categories");
