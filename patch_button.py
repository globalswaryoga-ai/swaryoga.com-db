with open("app/admin/crm/new-registration/_WorkshopFormTab.tsx", "r") as f:
    content = f.read()

button_html = """
                    <button
                      onClick={() => {
                        if (p.toast) p.toast.info('Syncing leads from Google Forms...');
                        if (p.setRefreshLeadsCounter) p.setRefreshLeadsCounter((prev: number) => prev + 1);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 shrink-0 mr-2"
                      title="Manually fetch latest leads from Google Forms"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      Sync Leads
                    </button>
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 mr-2 shrink-0">"""

content = content.replace('<div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 mr-2 shrink-0">', button_html)

with open("app/admin/crm/new-registration/_WorkshopFormTab.tsx", "w") as f:
    f.write(content)

print("done")
