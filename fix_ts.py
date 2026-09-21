import os
import re

def fix_file(path, replacements):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    for search, replace in replacements:
        content = content.replace(search, replace)
    
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {path}")

fix_file('app/api/admin/crm/sales/extract-pdf/route.ts', [
    ('export async function POST(request: NextRequest) {', 'export async function POST(request: NextRequest): Promise<Response> {')
])

fix_file('app/api/admin/sadhana-scheduler/status/route.ts', [
    ('export async function GET(request: NextRequest) {', 'export async function GET(request: NextRequest): Promise<Response> {'),
    ('export async function POST(request: NextRequest) {', 'export async function POST(request: NextRequest): Promise<Response> {')
])

# Fix app/life-planner/ritucharya/page.tsx
fix_file('app/life-planner/ritucharya/page.tsx', [
    ('export default function RitucharyaPage({ searchParams }: { searchParams: { ritu?: string } }) {', 
     'export default function RitucharyaPage(props: { searchParams: Promise<{ ritu?: string }> | { ritu?: string } }) {')
])

fix_file('app/sadhana/community/private-videos/[videoId]/page.tsx', [
    ('export default function PrivateVideoClient({', 'export default function PrivateVideoClient(props: {'),
    ('params: { videoId: string };', 'params: Promise<{ videoId: string }> | { videoId: string };')
])

fix_file('app/sadhana/community/private-videos/page.tsx', [
    ('export default function PrivateVideosClient({', 'export default function PrivateVideosClient(props: {')
])

# Wait, let's just re-run tsc to see what's actually left.
