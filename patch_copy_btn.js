const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/form-questions/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// We need to add the Copy Link button and also make sure lucide-react has Copy imported if not already.
if (!content.includes('Copy,')) {
    content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, Copy } from 'lucide-react';");
}

const copyButtonCode = `
                <button
                  onClick={() => {
                    const url = \`https://swaryoga.com/enquiry?w=\${activeForm.formId}\`;
                    navigator.clipboard.writeText(url);
                    showToast('Link copied to clipboard!');
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
                >
                  <Copy size={16} /> Copy Link
                </button>
`;

content = content.replace(
  /<button\s+onClick=\{async \(\) => \{\s+setGeneratingShort\(true\);/m,
  copyButtonCode + '\n                <button\n                  onClick={async () => {\n                    setGeneratingShort(true);'
);

fs.writeFileSync(file, content);
console.log('Patched copy button');
