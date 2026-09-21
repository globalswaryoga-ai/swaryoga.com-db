import os
import re

def patch_file(path, regex_replacements):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    for pattern, repl in regex_replacements:
        content = re.sub(pattern, repl, content)
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {path}")

# 1. form-questions: submissionCount, SetStateAction types
patch_file('app/admin/crm/form-questions/page.tsx', [
    (r"f\.submissionCount", "(f as any).submissionCount"),
    (r"\(f: Partial<Question>\)", "(f: any)")
])

# 2. accounting/page.tsx: inv and d are possibly null
patch_file('app/admin/crm/planner-dashboard/accounting/page.tsx', [
    (r"inv\.", "inv?."),
    (r"d\.", "d?.")
])

# 3. ritucharya diet plan: MealSlot mismatch
patch_file('app/admin/crm/ritucharya/diet-plan/page.tsx', [
    (r"foods: \[\]", "foods: [] as any[]")
])

# 4. ritucharya dietary recommendations: string to number
patch_file('app/admin/crm/ritucharya/dietary-recommendations/page.tsx', [
    (r"Number\(e\.target\.value\)", "e.target.value as any"),
    (r"(displayOrder:|monthRangeStart:|monthRangeEnd:)\s*e\.target\.value", r"\1 Number(e.target.value)")
])

# 5. ritucharya logic: formData.characterEn is possibly undefined
patch_file('app/admin/crm/ritucharya/logic/page.tsx', [
    (r"formData\.characterEn", "(formData.characterEn || '')")
])

# 6. sales page: number to string
patch_file('app/admin/crm/sales/page.tsx', [
    (r"value={0}", "value={'0'}"),
    (r"value={([a-zA-Z0-9_]+)\.length}", r"value={String(\1.length)}")
])

# 7. admin-activity route: createdAt on array/object
patch_file('app/api/admin/crm/admin-activity/route.ts', [
    (r"\.sort\(\(a: any, b: any\) => new Date\(b\.createdAt\)\.getTime\(\) - new Date\(a\.createdAt\)\.getTime\(\)\)", 
     ".sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())")
])

# 8. analytics whatsapp route: Operator > and /
patch_file('app/api/admin/crm/analytics/whatsapp/route.ts', [
    (r"duration > 0", "Number(duration) > 0"),
    (r"totalDuration \/ count", "Number(totalDuration) / Number(count)")
])

# 9. ritucharya page.tsx export signature (which failed earlier)
patch_file('app/life-planner/ritucharya/page.tsx', [
    (r"export default function RitucharyaPage\(\{\s*searchParams\s*\}\s*:\s*\{\s*searchParams\s*:\s*\{\s*ritu\s*\??\s*:\s*string\s*\}\s*\}\)", 
     "export default function RitucharyaPage(props: { searchParams: Promise<{ ritu?: string }> | { ritu?: string } })")
])

# 10. private-videos page.tsx export signature
patch_file('app/sadhana/community/private-videos/page.tsx', [
    (r"export default function PrivateVideosPage\(\{\s*searchParams\s*\}\s*:\s*\{\s*searchParams\s*:\s*\{\s*token\s*\??\s*:\s*string\s*\}\s*\}\)",
     "export default function PrivateVideosPage(props: { searchParams: Promise<{ token?: string }> | { token?: string } })")
])

