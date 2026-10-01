const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

// 1. Update state
code = code.replace(
  "const [metaPlatformsList] = useState<string[]>(['FB(size)', 'Insta(size)', 'YouTube(16:9)', '1:1', 'PDF']);",
  "const [metaPlatformsList, setMetaPlatformsList] = useState<string[]>(['FB(size)', 'Insta(size)', 'YouTube(16:9)', '1:1', 'PDF']);"
);

// 2. Update useEffect to load stored platforms
code = code.replace(
  "const storedLangs = localStorage.getItem('meta_languages');",
  "const storedPlats = localStorage.getItem('meta_platforms');\\n      if (storedPlats) setMetaPlatformsList(JSON.parse(storedPlats));\\n\\n      const storedLangs = localStorage.getItem('meta_languages');"
);

// 3. Add handleAddPlatform
const addLanguageCode = `  const handleAddLanguage = () => {`;
const addPlatformCode = `  const handleAddPlatform = () => {
    const plat = prompt('Enter new platform (e.g., Twitter, LinkedIn):');
    if (plat && plat.trim()) {
      const newPlats = [...metaPlatformsList, plat.trim()];
      setMetaPlatformsList(newPlats);
      if (typeof window !== 'undefined') localStorage.setItem('meta_platforms', JSON.stringify(newPlats));
    }
  };
  
  const handleSavePlatforms = () => {
    if (typeof window !== 'undefined') localStorage.setItem('meta_platforms', JSON.stringify(metaPlatformsList));
    alert('Platforms saved successfully!');
  };

  const handleAddLanguage = () => {`;

code = code.replace(addLanguageCode, addPlatformCode);

// 4. Update the render in Meta Advertise
const oldPlatRender = `                     <div className="flex gap-2 flex-wrap mb-4">
                         {metaPlatformsList.map(plat => (
                           <button 
                             key={plat} 
                             onClick={() => setMetaPlatform(plat)}
                             className={\`px-4 py-2 rounded-lg text-xs font-bold transition-all \${metaPlatform === plat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
                           >
                             {plat}
                           </button>
                         ))}
                       </div>`;

const newPlatRender = `                     <div className="flex gap-2 flex-wrap mb-4 items-center">
                         {metaPlatformsList.map(plat => (
                           <button 
                             key={plat} 
                             onClick={() => setMetaPlatform(plat)}
                             className={\`px-4 py-2 rounded-lg text-xs font-bold transition-all \${metaPlatform === plat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
                           >
                             {plat}
                           </button>
                         ))}
                         <button onClick={handleAddPlatform} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors" title="Add Platform">
                            <Plus size={18} />
                         </button>
                         <button onClick={handleSavePlatforms} className="ml-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                            Save
                         </button>
                       </div>`;

code = code.replace(oldPlatRender, newPlatRender);

fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
console.log("Replaced platforms functionality successfully!");
