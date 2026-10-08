with open("app/admin/crm/new-registration/_WorkshopFormTab.tsx", "r") as f:
    content = f.read()

target = "title={lead.mobile || lead.phoneNumber}>{lead.mobile || lead.phoneNumber || '-'}"
replacement = "title={lead.mobile || lead.phoneNumber || lead.whatsapp || lead.WhatsApp || lead.Contact}>{lead.mobile || lead.phoneNumber || lead.whatsapp || lead.WhatsApp || lead.Contact || '-'}"

content = content.replace(target, replacement)

with open("app/admin/crm/new-registration/_WorkshopFormTab.tsx", "w") as f:
    f.write(content)

print("done")
