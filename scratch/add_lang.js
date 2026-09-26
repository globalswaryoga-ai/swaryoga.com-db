const fs = require('fs');
const file = 'app/admin/crm/new-registration/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const [newBatchName, setNewBatchName] = useState('');",
  "const [newBatchName, setNewBatchName] = useState('');\n  const [newBatchLanguage, setNewBatchLanguage] = useState('English');"
);

content = content.replace(
  `                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Workshop Name</label>
                  <input 
                    type="text" `,
  `                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Language</label>
                  <select 
                    value={newBatchLanguage}
                    onChange={e => setNewBatchLanguage(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Kannada">Kannada</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Workshop Name</label>
                  <input 
                    type="text" `
);

content = content.replace(
  `                  const newBatch = {
                    id: \`w\${Date.now()}\`,
                    name: newBatchName,
                    formId: '',
                    leads: 0
                  };`,
  `                  const newBatch = {
                    id: \`w\${Date.now()}\`,
                    name: newBatchName,
                    language: newBatchLanguage,
                    formId: '',
                    leads: 0
                  };`
);

fs.writeFileSync(file, content);
console.log("Success");
