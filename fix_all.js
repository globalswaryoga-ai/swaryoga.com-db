const fs = require('fs');
const path = require('path');

const dir = '/Users/mohankalburgi/swaryoga.com-db';

function replace(file, search, replaceStr) {
  const p = path.join(dir, file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes(search)) {
      content = content.split(search).join(replaceStr);
      fs.writeFileSync(p, content, 'utf8');
      console.log('Fixed:', file);
    }
  }
}

function regexReplace(file, regex, replaceStr) {
  const p = path.join(dir, file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(regex, replaceStr);
    fs.writeFileSync(p, content, 'utf8');
    console.log('Regex Fixed:', file);
  }
}

// 1. sadhana-scheduler/status
replace('app/api/admin/sadhana-scheduler/status/route.ts', 'export function addSchedulerLog', 'function addSchedulerLog');

// 2. enquiry layout
replace('app/enquiry/layout.tsx', 'export default function EnquiryLayout({ children }: Props)', 'export default async function EnquiryLayout(props: Props & { searchParams: Promise<any> }) { const { children } = props;');
// Also let's just make the generateMetadata properly typed
regexReplace('app/enquiry/layout.tsx', /export async function generateMetadata.*?\{/s, `type LayoutProps = { children: React.ReactNode; searchParams: Promise<{ w?: string; workshopId?: string }> };\nexport async function generateMetadata(props: LayoutProps): Promise<Metadata> {`);

// 3. ritucharya
replace('app/life-planner/ritucharya/page.tsx', 'export default function RitucharyaPage(props: { searchParams: Promise<{ ritu?: string }> | { ritu?: string } }) {', 'export default async function RitucharyaPage(props: { searchParams: Promise<{ ritu?: string }> }) {\n  const searchParams = await props.searchParams;');
replace('app/life-planner/ritucharya/page.tsx', 'export default function RitucharyaPage({ searchParams }: { searchParams: { ritu?: string } }) {', 'export default async function RitucharyaPage(props: { searchParams: Promise<{ ritu?: string }> }) {\n  const searchParams = await props.searchParams;');

// 4. private-videos page
replace('app/sadhana/community/private-videos/page.tsx', 'export default function PrivateVideosPage(props: { searchParams: Promise<{ token?: string }> | { token?: string } }) {', 'export default async function PrivateVideosPage(props: { searchParams: Promise<{ token?: string }> }) {\n  const searchParams = await props.searchParams;');
replace('app/sadhana/community/private-videos/page.tsx', 'export default function PrivateVideosPage({ searchParams }: { searchParams: { token?: string } }) {', 'export default async function PrivateVideosPage(props: { searchParams: Promise<{ token?: string }> }) {\n  const searchParams = await props.searchParams;');

// 5. private-videos videoId page
replace('app/sadhana/community/private-videos/[videoId]/page.tsx', 'export default function PrivateVideoPlayerPage({ params, searchParams }: { params: { videoId: string }, searchParams: { token?: string } }) {', 'export default async function PrivateVideoPlayerPage(props: { params: Promise<{ videoId: string }>, searchParams: Promise<{ token?: string }> }) {\n  const params = await props.params;\n  const searchParams = await props.searchParams;');

// 6. admin/crm/sales/page.tsx
regexReplace('app/admin/crm/sales/page.tsx', /value=\{monthIndex\}/g, 'value={String(monthIndex)}');
regexReplace('app/admin/crm/sales/page.tsx', /value=\{y\}/g, 'value={String(y)}');
regexReplace('app/admin/crm/sales/page.tsx', /value=\{i\}/g, 'value={String(i)}');

// 7. admin-activity route
replace('app/api/admin/crm/admin-activity/route.ts', '.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())', '.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())');

// 8. whatsapp analytics route
replace('app/api/admin/crm/analytics/whatsapp/route.ts', 'duration > 0', 'Number(duration) > 0');
replace('app/api/admin/crm/analytics/whatsapp/route.ts', 'totalDuration / count', 'Number(totalDuration) / Number(count)');

