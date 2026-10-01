const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

const oldAdvBlock = `                     <div>
                       <label className="text-sm font-bold text-slate-700 mb-2 block">What is the ad about?</label>
                       <textarea 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                         placeholder={\`e.g., A 3-day Swar Yoga workshop focusing on stress relief. Target audience is stressed professionals. (Will generate in \${metaLanguage})\`}
                         value={metaPrompt}
                         onChange={e => setMetaPrompt(e.target.value)}
                       />
                     </div>
                     
                     <div>
                       <label className="text-sm font-bold text-slate-700 mb-2 block">Canva Ad Template ID for FB</label>
                       <input 
                         type="text" 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                         value={metaTemplatesMap['FB'] || ''}
                         onChange={e => handleUpdateTemplate(e.target.value)}
                         placeholder="Enter Template ID for FB"
                       />
                       <p className="text-xs text-slate-500 mt-2">
                         Make sure your Canva template has text placeholders named <code className="bg-slate-100 px-1 py-0.5 rounded">Headline</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">Subheading</code>, and <code className="bg-slate-100 px-1 py-0.5 rounded">CTA</code>.
                       </p>
                     </div>
                     
                     <button 
                       onClick={() => { setMetaPlatform('FB(size)'); handleGenerateMetaAI(); }}
                       disabled={isGeneratingMeta}
                       className={\`mt-4 w-full py-4 rounded-xl font-black text-white text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 \${isGeneratingMeta ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'}\`}
                     >
                       {isGeneratingMeta ? (
                         <>
                           <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                           Generating Ad in {metaLanguage}...
                         </>
                       ) : (
                         <>
                           ✨ Generate AI Ad & Open in Canva
                         </>
                       )}
                     </button>`;

const newAdvBlock = `                     <div>
                       <div className="flex items-center justify-between mb-2">
                         <label className="text-sm font-bold text-slate-700">Platform to Generate</label>
                       </div>
                       <div className="flex gap-2 flex-wrap mb-4">
                         {metaPlatformsList.map(plat => (
                           <button 
                             key={plat} 
                             onClick={() => setMetaPlatform(plat)}
                             className={\`px-4 py-2 rounded-lg text-xs font-bold transition-all \${metaPlatform === plat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
                           >
                             {plat}
                           </button>
                         ))}
                       </div>
                     </div>
                     <div>
                       <label className="text-sm font-bold text-slate-700 mb-2 block">What is the ad about?</label>
                       <textarea 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                         placeholder={\`e.g., A 3-day Swar Yoga workshop focusing on stress relief. Target audience is stressed professionals. (Will generate in \${metaLanguage} for \${metaPlatform})\`}
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
                     </button>`;

if(code.includes(oldAdvBlock)) {
  code = code.replace(oldAdvBlock, newAdvBlock);
  fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
  console.log("Successfully replaced Meta Advertise block!");
} else {
  console.log("Failed to find block to replace.");
}
