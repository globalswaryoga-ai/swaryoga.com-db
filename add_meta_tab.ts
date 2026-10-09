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
        
        // Add import
        if (!code.includes("import { MetaLeadsTab }")) {
            code = code.replace(
                "import { WorkshopFormTab } from '../_WorkshopFormTab';",
                "import { WorkshopFormTab } from '../_WorkshopFormTab';\nimport { MetaLeadsTab } from '../_MetaLeadsTab';"
            );
        }

        // Add render logic
        if (!code.includes("activeTab === 'meta_leads' &&")) {
            code = code.replace(
                "{activeTab === 'leads_management' && (",
                "{activeTab === 'meta_leads' && (\n            <MetaLeadsTab\n              selectedWorkshop={selectedWorkshop}\n              saveWorkshopSettings={saveWorkshopSettings}\n              leadsData={displayLeads}\n            />\n          )}\n          {activeTab === 'leads_management' && ("
            );
        }

        fs.writeFileSync(filePath, code);
        console.log("Updated", relPath);
    }
}
