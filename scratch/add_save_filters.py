with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

old_clear = """                                    <X size={14} /> Clear
                                  </button>
                                )}
                              </div>"""

new_clear = """                                    <X size={14} /> Clear
                                  </button>
                                )}
                                <button onClick={saveWorkshopSettings} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-3 py-1 rounded text-xs transition-colors whitespace-nowrap ml-2 border border-indigo-200">
                                  Save Filters for AI-4
                                </button>
                              </div>"""

if old_clear in content:
    content = content.replace(old_clear, new_clear)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
