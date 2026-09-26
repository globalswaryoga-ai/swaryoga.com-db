filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Fix the state type and default - remove 'all_data', rename 'forms' to become the first tab
# Current: useState<'all_data'|'details'|'forms'|'leads'|'closing'|'templates'>('all_data')
# New: useState<'forms'|'details'|'leads'|'closing'|'templates'>('forms')
content = content.replace(
    "useState<'all_data'|'details'|'forms'|'leads'|'closing'|'templates'>('all_data')",
    "useState<'forms'|'details'|'leads'|'closing'|'templates'>('forms')"
)

# 2. Remove selectedDashboardLang state (no longer needed for master dashboard)
# But keep it in case it's used elsewhere - actually just leave it, harmless

# 3. Fix TopTabs - remove all_data, rename forms to "All Leads Data", put it first
old_tabs = """  const TopTabs = [
    { id: 'all_data', label: 'Leads All Data', icon: Users },
    { id: 'details', label: 'Workshop Details', icon: Calendar },
    { id: 'forms', label: 'Workshop Forms', icon: FileText },
    { id: 'leads', label: 'Leads Management', icon: Users },
    { id: 'closing', label: 'Leads Closing', icon: Handshake },
    { id: 'templates', label: 'Message Templates', icon: MessageSquare },
  ] as const;"""

new_tabs = """  const TopTabs = [
    { id: 'forms', label: 'All Leads Data', icon: Users },
    { id: 'details', label: 'Workshop Details', icon: Calendar },
    { id: 'leads', label: 'Leads Management', icon: Users },
    { id: 'closing', label: 'Leads Closing', icon: Handshake },
    { id: 'templates', label: 'Message Templates', icon: MessageSquare },
  ] as const;"""

if old_tabs in content:
    content = content.replace(old_tabs, new_tabs)
    print("CHANGE 1 OK: TopTabs updated")
else:
    print("WARN: TopTabs not matched exactly")

# 4. Fix canAccessTab - remove all_data special case (no longer needed)
content = content.replace(
    "  const canAccessTab = (tabId: string) => {\n    if (tabId === 'all_data') return true;\n    return !!selectedWorkshop;\n  };",
    "  const canAccessTab = (tabId: string) => {\n    return !!selectedWorkshop;\n  };"
)

# 5. Remove the entire all_data tab panel from the JSX
# It starts with:  {/* TAB 0: Leads All Data */}
# and ends just before: {activeTab !== 'all_data' && !selectedWorkshop ? (
old_all_data_panel_start = "          {/* TAB 0: Leads All Data */}\n          {activeTab === 'all_data' && ("
old_main_marker = "          {activeTab !== 'all_data' && !selectedWorkshop ? ("
new_main_marker = "          {!selectedWorkshop ? ("

# Find the all_data panel and remove it
start_idx = content.find(old_all_data_panel_start)
end_idx = content.find(old_main_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + "          " + content[end_idx:]
    print(f"CHANGE 2 OK: all_data panel removed ({end_idx - start_idx} chars)")
else:
    print(f"WARN: all_data panel markers - start={start_idx}, end={end_idx}")

# 6. Fix the !selectedWorkshop guard (remove the 'all_data' condition)
content = content.replace(
    "          {activeTab !== 'all_data' && !selectedWorkshop ? (",
    "          {!selectedWorkshop ? ("
)

# 7. Rename "Workshop Forms" header inside the forms tab to "All Leads Data"
content = content.replace(
    '<h2 className="text-lg font-bold text-slate-800">Workshop Forms - {leadsData.length}</h2>',
    '<h2 className="text-lg font-bold text-slate-800">All Leads Data - {leadsData.length}</h2>'
)
content = content.replace(
    '<p className="text-sm text-slate-500">Leads captured from the connected form.</p>',
    '<p className="text-sm text-slate-500">All leads captured from the Google Form for this batch.</p>'
)

with open(filepath, 'w') as f:
    f.write(content)
print("Done! File saved.")
