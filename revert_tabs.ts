import fs from 'fs';
import path from 'path';

const files = [
    'english/page.tsx',
    'hindi/page.tsx',
    'marathi/page.tsx',
    'kannada/page.tsx'
];

for (const relPath of files) {
    const filePath = path.join('/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration', relPath);
    if (fs.existsSync(filePath)) {
        let code = fs.readFileSync(filePath, 'utf8');
        
        // Remove router logic
        code = code.replace(
            "onClick={() => {\n                    if (tab.id === 'meta_leads') {\n                      router.push('/admin/crm/meta');\n                      return;\n                    }\n                    if (tab.id === 'all_leads') {",
            "onClick={() => {\n                    if (tab.id === 'all_leads') {"
        );

        fs.writeFileSync(filePath, code);
        console.log("Updated", relPath);
    }
}
