import sys

def modify_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # The block to move (Workshop Registration Form)
    # Line 2120: <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 w-full">
    # Line 2773: </div>
    # The block to delete (Linked Leads in all_data)
    # Line 2774: 
    # Line 3363: </div>

    # Find the indices dynamically just to be safe
    start_idx = -1
    end_form_idx = -1
    end_leads_idx = -1
    forms_tab_idx = -1

    for i, line in enumerate(lines):
        if 'className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 w-full"' in line and start_idx == -1:
            start_idx = i
        if '<!-- Render Fetched Leads Inline in All Data Tab -->' in line or 'Render Fetched Leads Inline in All Data Tab' in line:
            end_form_idx = i - 1 # actually the div ends a bit earlier
        if 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"' in line:
            end_leads_idx = i - 1
        if '{/* TAB 2: Workshop Forms */}' in line:
            forms_tab_idx = i

    print(f"start_idx: {start_idx}, end_form_idx: {end_form_idx}, end_leads_idx: {end_leads_idx}, forms_tab_idx: {forms_tab_idx}")

modify_file('/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx')
