with open('lib/workshopBunnyRepository.ts', 'r') as f:
    content = f.read()

import re

# Find the exact allowed object
match = re.search(r'const allowed: Record<string, string> = \{[^\}]+\};', content)
if match:
    old_allowed = match.group(0)
    new_allowed = old_allowed.replace('};', '  metadata: \'metadata_json\'\n  };')
    content = content.replace(old_allowed, new_allowed)

# Find the query execution
old_args = "args: [...sets.map(([, value]) => value || null), now(), cohortId]"
new_args = "args: [...sets.map(([k, v]) => k === 'metadata' || k === 'daySubjects' || k === 'holidayDates' ? (typeof v === 'object' ? JSON.stringify(v) : v || '{}') : (v || null)), now(), cohortId]"

content = content.replace(old_args, new_args)

with open('lib/workshopBunnyRepository.ts', 'w') as f:
    f.write(content)
