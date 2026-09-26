with open('app/api/admin/crm/workshop-management/route.ts', 'r') as f:
    content = f.read()

import re

updates_code = """    if (body.communityId !== undefined) {
      updates.communityId = body.communityId ? String(body.communityId).trim() : null;
    }"""

new_updates_code = """    if (body.communityId !== undefined) {
      updates.communityId = body.communityId ? String(body.communityId).trim() : null;
    }
    if (body.metadata !== undefined) {
      updates.metadata = body.metadata;
    }"""

if updates_code in content:
    content = content.replace(updates_code, new_updates_code)

with open('app/api/admin/crm/workshop-management/route.ts', 'w') as f:
    f.write(content)
