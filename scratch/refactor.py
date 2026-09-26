import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# Add pending2LeadIds state
content = content.replace(
    "const [pendingLeadIds, setPendingLeadIds] = useState<string[]>([]);",
    "const [pendingLeadIds, setPendingLeadIds] = useState<string[]>([]);\n  const [pending2LeadIds, setPending2LeadIds] = useState<string[]>([]);"
)

# Local Storage saving/loading
content = content.replace(
    "const savedPending = getAndParse('crm_pending_ids' + suffix);",
    "const savedPending = getAndParse('crm_pending_ids' + suffix);\n        const savedPending2 = getAndParse('crm_pending2_ids' + suffix);"
)
content = content.replace(
    "if (savedPending) setPendingLeadIds(savedPending);",
    "if (savedPending) setPendingLeadIds(savedPending);\n        if (savedPending2) setPending2LeadIds(savedPending2);"
)
content = content.replace(
    "setAndCollect('crm_pending_ids' + suffix, JSON.stringify(pendingLeadIds));",
    "setAndCollect('crm_pending_ids' + suffix, JSON.stringify(pendingLeadIds));\n        setAndCollect('crm_pending2_ids' + suffix, JSON.stringify(pending2LeadIds));"
)

content = content.replace(
    "approvedLeadIds, pendingLeadIds, registeredLeadIds",
    "approvedLeadIds, pendingLeadIds, pending2LeadIds, registeredLeadIds"
)

# LeadSubTabs
content = content.replace(
    "{ id: 'pending', label: 'Pending Forms' },",
    "{ id: 'pending', label: 'Pending-1' },\n    { id: 'pending2', label: 'Pending-2' },"
)

# segmentCounts
content = content.replace(
    "pending: leadsData.filter(l => crmLeadIds.includes(l.id) && pendingLeadIds.includes(l.id) && !approvedLeadIds.includes(l.id) && !registeredLeadIds.includes(l.id)).length,",
    "pending: leadsData.filter(l => crmLeadIds.includes(l.id) && pendingLeadIds.includes(l.id) && !approvedLeadIds.includes(l.id) && !registeredLeadIds.includes(l.id)).length,\n      pending2: leadsData.filter(l => crmLeadIds.includes(l.id) && pending2LeadIds.includes(l.id)).length,"
)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
print("Basic state and tabs refactored")
