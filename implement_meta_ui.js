const fs = require('fs');
const filePath = 'app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variables at the beginning of the component
const stateHookAnchor = "const [generatedAiImage, setGeneratedAiImage] = useState<string | null>(null);";
const stateCode = `
  const [metaLanguagesList, setMetaLanguagesList] = useState<string[]>(['English', 'Marathi', 'Hindi']);
  const [metaLanguage, setMetaLanguage] = useState<string>('English');
  const [metaPlatformsList] = useState<string[]>(['FB', 'Insta', 'YouTube', '1:1', 'PDF']);
  const [metaPlatform, setMetaPlatform] = useState<string>('FB');
  const [metaTemplatesMap, setMetaTemplatesMap] = useState<Record<string, string>>({});
  const [savedMetaAds, setSavedMetaAds] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLangs = localStorage.getItem('meta_languages');
      if (storedLangs) setMetaLanguagesList(JSON.parse(storedLangs));
      
      const storedMap = localStorage.getItem('meta_templates_map');
      if (storedMap) setMetaTemplatesMap(JSON.parse(storedMap));
      
      const storedAds = localStorage.getItem('saved_meta_ads');
      if (storedAds) setSavedMetaAds(JSON.parse(storedAds));
    }
  }, []);

  const handleAddLanguage = () => {
    const lang = prompt('Enter new language name:');
    if (lang && lang.trim()) {
      const newLangs = [...metaLanguagesList, lang.trim()];
      setMetaLanguagesList(newLangs);
      if (typeof window !== 'undefined') localStorage.setItem('meta_languages', JSON.stringify(newLangs));
    }
  };

  const handleDeleteLanguage = (lang: string) => {
    if (confirm(\`Are you sure you want to delete \${lang}?\`)) {
      const newLangs = metaLanguagesList.filter(l => l !== lang);
      setMetaLanguagesList(newLangs);
      if (typeof window !== 'undefined') localStorage.setItem('meta_languages', JSON.stringify(newLangs));
      if (metaLanguage === lang) setMetaLanguage(newLangs[0] || '');
    }
  };

  const handleUpdateTemplate = (val: string) => {
    const newMap = { ...metaTemplatesMap, [metaPlatform]: val };
    setMetaTemplatesMap(newMap);
    if (typeof window !== 'undefined') localStorage.setItem('meta_templates_map', JSON.stringify(newMap));
  };
`;
if (content.includes(stateHookAnchor)) {
  content = content.replace(stateHookAnchor, stateHookAnchor + "\n" + stateCode);
} else {
  console.log("Could not find state hook anchor");
}

// 2. Modify handleGenerateMetaAI to use the correct template ID and save the ad
const oldGenerateAnchor = "const res = await fetch('/api/admin/canva/meta-ai', {";
const newGenerateCode = `
      const targetTemplateId = metaTemplatesMap[metaPlatform];
      if (!targetTemplateId) {
        alert(\`Please enter a Canva Template ID for \${metaPlatform}\`);
        setIsGeneratingMeta(false);
        return;
      }
      const fullPrompt = \`Target Language: \${metaLanguage}\\nPlatform: \${metaPlatform}\\n\\n\${metaPrompt}\`;
      const res = await fetch('/api/admin/canva/meta-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, templateId: targetTemplateId })
      });
`;
content = content.replace(/const res = await fetch\('\/api\/admin\/canva\/meta-ai', \{[\s\S]*?\}\);/, newGenerateCode);

// Add saving logic at the end of the generator
const saveAnchor = `setGeneratedDesignId(designId);`;
const saveCode = `
          setGeneratedDesignId(designId);
          // Auto-save the generated ad
          const newAd = {
            id: Date.now().toString(),
            prompt: metaPrompt,
            language: metaLanguage,
            platform: metaPlatform,
            text: aiText,
            imageUrl: aiImageUrl,
            designId: designId,
            createdAt: new Date().toISOString()
          };
          const updatedAds = [newAd, ...savedMetaAds];
          setSavedMetaAds(updatedAds);
          if (typeof window !== 'undefined') localStorage.setItem('saved_meta_ads', JSON.stringify(updatedAds));
`;
content = content.replace(saveAnchor, saveCode);

// 3. Remove "Meta Work" button from top header
content = content.replace(/<button[^>]*onClick=\{\(\) => setActiveSection\('meta'\)\}[^>]*>[\s\S]*?<\/button>/, '');

// 4. Remove activeSection === 'meta' entirely from the working area
// We just rip it out from `{/* META WORK */}` down to just before `{/* DOWNLOADS SECTION */}`
const metaWorkRegex = /\{\/\*\s*META WORK\s*\*\/\}\s*\{activeSection === 'meta' && \([\s\S]*?\}\)\s*\{\/\*\s*DOWNLOADS SECTION\s*\*\/\}/;
content = content.replace(metaWorkRegex, '{/* DOWNLOADS SECTION */}');

// 5. Build the UI and replace the `downloadTab === 'meta'` area
const downloadMetaRegex = /\{\/\*\s*Content Area\s*\*\/\}\s*\{downloadTab === 'meta' \? \([\s\S]*?\) : \(/;

const downloadMetaCode = `
                 {/* Content Area */}
                 {downloadTab === 'meta' ? (
                   <div className="flex flex-col gap-12 w-full pb-12">
                      {/* Meta Ad Studio Layout */}
                      <div className="flex min-h-[500px] gap-8 w-full">
                        {/* Sidebar */}
                        <div className="w-64 flex-shrink-0 flex flex-col gap-6">
                          <div className="mb-2">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight">Ad Studio</h3>
                            <p className="text-slate-500 mt-1 text-sm font-medium">Generate AI copy and images</p>
                          </div>
                          
                          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold text-slate-700">Languages</h4>
                              <button onClick={handleAddLanguage} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors">
                                <Plus size={18} />
                              </button>
                            </div>
                            <div className="flex flex-col gap-2">
                              {metaLanguagesList.map(lang => (
                                <div 
                                  key={lang} 
                                  className={\`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors \${metaLanguage === lang ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'hover:bg-slate-50 text-slate-600 font-medium border border-transparent'}\`} 
                                  onClick={() => setMetaLanguage(lang)}
                                >
                                  <span>{lang}</span>
                                  {metaLanguagesList.length > 1 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteLanguage(lang); }} 
                                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                                      title="Delete Language"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Main Area */}
                        <div className="flex-1 flex flex-col">
                           {/* Platform Tabs */}
                           <div className="flex items-center gap-2 mb-6 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
                             {metaPlatformsList.map(plat => (
                               <button 
                                 key={plat} 
                                 onClick={() => setMetaPlatform(plat)}
                                 className={\`px-6 py-2.5 rounded-xl font-bold text-sm transition-all \${metaPlatform === plat ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}\`}
                               >
                                 {plat}
                               </button>
                             ))}
                           </div>

                           <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-8">
                              <div className="flex flex-col gap-6 max-w-2xl w-full">
                                 <div>
                                   <label className="text-sm font-bold text-slate-700 mb-2 block">What is the ad about?</label>
                                   <textarea 
                                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                     placeholder={\`e.g., A 3-day Swar Yoga workshop focusing on stress relief. Target audience is stressed professionals. (Will generate in \${metaLanguage})\`}
                                     value={metaPrompt}
                                     onChange={e => setMetaPrompt(e.target.value)}
                                   />
                                 </div>
                                 
                                 <div>
                                   <label className="text-sm font-bold text-slate-700 mb-2 block">Canva Ad Template ID for {metaPlatform}</label>
                                   <input 
                                     type="text" 
                                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                     value={metaTemplatesMap[metaPlatform] || ''}
                                     onChange={e => handleUpdateTemplate(e.target.value)}
                                     placeholder={\`Enter Template ID for \${metaPlatform}\`}
                                   />
                                   <p className="text-xs text-slate-500 mt-2">
                                     Make sure your Canva template has text placeholders named <code className="bg-slate-100 px-1 py-0.5 rounded">Headline</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">Subheading</code>, and <code className="bg-slate-100 px-1 py-0.5 rounded">CTA</code>.
                                   </p>
                                 </div>
                                 
                                 <button 
                                   onClick={handleGenerateMetaAI}
                                   disabled={isGeneratingMeta}
                                   className={\`mt-4 w-full py-4 rounded-xl font-black text-white text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 \${isGeneratingMeta ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'}\`}
                                 >
                                   {isGeneratingMeta ? (
                                     <>
                                       <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                       Generating {metaPlatform} Ad in {metaLanguage}...
                                     </>
                                   ) : (
                                     <>
                                       ✨ Generate AI Ad & Open in Canva
                                     </>
                                   )}
                                 </button>
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* Saved Ads Section */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <h3 className="font-black text-slate-800 text-xl mb-6">Saved AI Meta Ads</h3>
                        {savedMetaAds.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {savedMetaAds.map(ad => (
                              <div key={ad.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col h-full bg-slate-50">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mr-2">{ad.platform}</span>
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">{ad.language}</span>
                                  </div>
                                  <span className="text-xs font-medium text-slate-400">{new Date(ad.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-700 mb-4 line-clamp-2">{ad.prompt}</p>
                                
                                <div className="flex-1">
                                  {ad.imageUrl && (
                                    <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-slate-200">
                                      <img src={ad.imageUrl} alt="Generated Ad" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  {ad.text?.Headline && (
                                    <p className="text-xs text-slate-600 font-bold mb-1">"{ad.text.Headline}"</p>
                                  )}
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-200 flex gap-3">
                                  <a 
                                    href={\`https://www.canva.com/design/\${ad.designId}/edit\`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-lg text-sm font-bold text-center hover:bg-indigo-100 transition-colors"
                                  >
                                    Edit in Canva
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon size={48} className="mb-4 opacity-20" />
                            <p className="font-bold text-slate-600 mb-1 text-lg">No saved Meta ads found.</p>
                            <p className="text-sm">Use the Ad Studio above to generate some AI ads!</p>
                          </div>
                        )}
                      </div>
                   </div>
                 ) : (`;

content = content.replace(downloadMetaRegex, downloadMetaCode);

fs.writeFileSync(filePath, content);
console.log("Success!");
