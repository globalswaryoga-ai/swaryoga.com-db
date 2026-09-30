import fs from 'fs';
import path from 'path';

const files = [
  'app/admin/crm/new-registration/_WorkshopFormTab.tsx',
  'app/admin/crm/new-registration/_LeadsManagementTab.tsx',
  'app/admin/crm/new-registration/page.tsx',
  'app/admin/crm/new-registration/_BroadcastNRTab.tsx'
];

const helper = `
// Helper to prevent double counting on long overlapping form answers
const isLeadMatchingKeyword = (valStr: string, keyword: string) => {
  const v = String(valStr).toLowerCase().trim();
  const k = String(keyword).toLowerCase().trim();
  if (!v || !k) return false;
  if (v === k) return true;
  // If it's a short custom keyword (<= 3 words), allow substring matching
  if (k.split(/\\s+/).length <= 3) return v.includes(k);
  return false;
};
`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('isLeadMatchingKeyword')) {
    // Insert helper after imports
    content = content.replace(/(import .*;\n)+/, (match) => match + '\n' + helper);
  }

  // WorkshopFormTab & _LeadsManagementTab & page.tsx (around line 800)
  content = content.replace(/keywords\.some\(\(k: string\) => String\(lead\._rawRecord\[ai7MappedQuestion\]\)\.toLowerCase\(\)\.includes\(k\)\)/g, 
    'keywords.some((k: string) => isLeadMatchingKeyword(lead._rawRecord[ai7MappedQuestion], k))');
  
  content = content.replace(/keywords\.some\(\(k: string\) => Object\.values\(lead\._rawRecord\)\.some\(val => String\(val\)\.toLowerCase\(\)\.includes\(k\)\)\)/g,
    'keywords.some((k: string) => Object.values(lead._rawRecord).some(val => isLeadMatchingKeyword(val as string, k)))');

  // page.tsx (around line 1018 and 1043)
  content = content.replace(/keywords\.some\(\(k: string\) => vals\.some\(\(v: any\) => v\.includes\(k\)\)\)/g,
    'keywords.some((k: string) => vals.some((v: any) => isLeadMatchingKeyword(v, k)))');

  // _BroadcastNRTab.tsx (around line 95)
  content = content.replace(/keywords\.some\(\(k: string\) => String\(lead\._rawRecord\[ai7\]\)\.toLowerCase\(\)\.includes\(k\)\)/g,
    'keywords.some((k: string) => isLeadMatchingKeyword(lead._rawRecord[ai7], k))');
  
  content = content.replace(/keywords\.some\(\(k: string\) => Object\.values\(lead\._rawRecord\)\.some\(v => String\(v\)\.toLowerCase\(\)\.includes\(k\)\)\)/g,
    'keywords.some((k: string) => Object.values(lead._rawRecord).some(v => isLeadMatchingKeyword(v as string, k)))');

  fs.writeFileSync(file, content);
}
