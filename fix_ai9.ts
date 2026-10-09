import fs from 'fs';
const file = 'app/admin/crm/meta/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldOnClick = `onClick={() => setIsAi9ModalOpen(true)}`;
const newOnClick = `onClick={() => {
                    if (selected?.metadata?.rawFieldData && Array.isArray(selected.metadata.rawFieldData)) {
                       const parsed = selected.metadata.rawFieldData.map((item: any) => {
                          if (item.question_text) return { q: item.question_text, a: item.response || '' };
                          if (item.name) return { q: item.name, a: item.values?.[0] || '' };
                          return null;
                       }).filter(Boolean);
                       
                       if (parsed.length > 0) {
                          setAi9Data(parsed);
                       } else {
                          setAi9Data([{ q: '', a: '' }]);
                       }
                    } else {
                       setAi9Data([{ q: '', a: '' }]);
                    }
                    setIsAi9ModalOpen(true);
                  }}`;

code = code.replace(oldOnClick, newOnClick);
fs.writeFileSync(file, code);
