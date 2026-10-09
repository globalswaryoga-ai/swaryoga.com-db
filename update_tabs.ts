import fs from 'fs';
import path from 'path';

const files = [
    'hindi/page.tsx',
    'marathi/page.tsx',
    'kannada/page.tsx'
];

for (const relPath of files) {
    const filePath = path.join('/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration', relPath);
    if (fs.existsSync(filePath)) {
        let code = fs.readFileSync(filePath, 'utf8');
        
        // Add meta_leads tab
        if (!code.includes("id: 'meta_leads'")) {
            code = code.replace(
                "  const TopTabs = [\n    { id: 'all_leads'",
                "  const TopTabs = [\n    { id: 'meta_leads', label: 'Meta Leads', icon: Users },\n    { id: 'all_leads'"
            );
        }

        // Add to canAccessTab
        if (code.includes('tabId === "all_leads"') && !code.includes('tabId === "meta_leads"')) {
            code = code.replace(
                'if (tabId === "all_leads"',
                'if (tabId === "meta_leads" || tabId === "all_leads"'
            );
        }

        // Add router logic
        if (code.includes("if (tab.id === 'all_leads') {") && !code.includes("if (tab.id === 'meta_leads') {")) {
            code = code.replace(
                "onClick={() => {\n                    if (tab.id === 'all_leads') {",
                "onClick={() => {\n                    if (tab.id === 'meta_leads') {\n                      router.push('/admin/crm/meta');\n                      return;\n                    }\n                    if (tab.id === 'all_leads') {"
            );
        }

        fs.writeFileSync(filePath, code);
        console.log("Updated", relPath);
    }
}
