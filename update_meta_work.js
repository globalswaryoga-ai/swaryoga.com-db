const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

// 1. Update platforms list
code = code.replace(
  "const [metaPlatformsList] = useState<string[]>(['FB', 'Insta', 'YouTube', '1:1', 'PDF']);",
  "const [metaPlatformsList] = useState<string[]>(['FB(size)', 'Insta(size)', 'YouTube(16:9)', '1:1', 'PDF']);"
);

// 2. We need to replace the ad generation form in downloadTab === 'meta'
// Let's find the exact block to replace.
const oldFormBlock = `                           <div>
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

                           {/* Generated Image Preview & Saved Ads */}
                           {(generatedAiImage || savedMetaAds.length > 0) && (
                             <div className="mt-8 pt-8 border-t border-slate-200">
                               {generatedAiImage && (
                                 <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                   <h4 className="font-bold text-indigo-800 mb-4 text-center">Just Generated</h4>
                                   <div className="rounded-xl overflow-hidden shadow-sm">
                                     <img src={generatedAiImage} alt="Generated AI Preview" className="w-full h-auto object-contain bg-white" />
                                   </div>
                                   {generatedAiText?.Headline && (
                                     <p className="mt-4 text-center font-bold text-indigo-900">"{generatedAiText.Headline}"</p>
                                   )}
                                   {generatedDesignId && (
                                     <a 
                                       href={\`https://www.canva.com/design/\${generatedDesignId}/edit\`} 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       className="mt-4 block w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-center hover:bg-indigo-700 transition-colors shadow-md"
                                     >
                                       Edit Current Ad in Canva
                                     </a>
                                   )}
                                 </div>
                               )}
                               
                               {savedMetaAds.length > 0 && (
                                 <div>
                                   <h4 className="font-bold text-slate-700 mb-4 text-center">Previous Ads</h4>
                                   <div className="flex flex-col gap-4">
                                     {savedMetaAds.map(ad => (
                                       <div key={ad.id} className="border border-slate-200 rounded-xl p-4 flex gap-4 bg-slate-50 items-center">
                                         {ad.imageUrl && (
                                           <div className="w-32 h-auto flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                             <img src={ad.imageUrl} alt="Past Ad Preview" className="w-full h-full object-cover" />
                                           </div>
                                         )}
                                         <div className="flex-1">
                                           <div className="flex items-center gap-2 mb-1">
                                             <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{ad.platform}</span>
                                             <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{ad.language}</span>
                                           </div>
                                           {ad.text?.Headline && <p className="font-bold text-slate-800 text-sm mb-2 leading-tight">"{ad.text.Headline}"</p>}
                                           <a 
                                             href={\`https://www.canva.com/design/\${ad.designId}/edit\`} 
                                             target="_blank" 
                                             rel="noopener noreferrer"
                                             className="inline-block bg-white border border-slate-200 text-slate-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                                           >
                                             Open in Canva
                                           </a>
                                         </div>
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </div>
                           )}`;

const newFormBlock = `                           <div className="w-full">
                             <h4 className="font-black text-slate-800 text-xl mb-6">Generated Ads Preview</h4>
                             {savedMetaAds.length > 0 ? (
                               <div className="grid grid-cols-2 gap-6">
                                 {savedMetaAds.filter(ad => ad.language === metaLanguage && ad.platform === metaPlatform).length > 0 ? (
                                   savedMetaAds.filter(ad => ad.language === metaLanguage && ad.platform === metaPlatform).map(ad => (
                                     <div key={ad.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 bg-slate-50">
                                       {ad.imageUrl && (
                                         <div className="w-full aspect-video flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                                           <img src={ad.imageUrl} alt="Generated AI Ad" className="w-full h-full object-contain" />
                                         </div>
                                       )}
                                       <div className="flex flex-col flex-1">
                                         {ad.text?.Headline && <p className="font-bold text-slate-800 text-sm mb-2">"{ad.text.Headline}"</p>}
                                         <div className="mt-auto flex justify-between items-center pt-2">
                                           <div className="flex gap-2">
                                             <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{ad.platform}</span>
                                             <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{ad.language}</span>
                                           </div>
                                           <a 
                                             href={\`https://www.canva.com/design/\${ad.designId}/view\`} 
                                             target="_blank" 
                                             rel="noopener noreferrer"
                                             className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                           >
                                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                             Download
                                           </a>
                                         </div>
                                       </div>
                                     </div>
                                   ))
                                 ) : (
                                   <div className="col-span-2 text-center text-slate-400 py-12">
                                     No ads generated for {metaLanguage} on {metaPlatform} yet.
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <div className="text-center text-slate-400 py-12">
                                 No ads generated yet. Go to Meta Advertise to generate some!
                               </div>
                             )}
                           </div>`;

if(code.includes(oldFormBlock)) {
  code = code.replace(oldFormBlock, newFormBlock);
  fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
  console.log("Successfully replaced Meta Work area with preview gallery!");
} else {
  console.log("Failed to find block to replace.");
}
