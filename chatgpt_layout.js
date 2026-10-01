const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

const oldBlock = code.substring(code.indexOf("{/* META ADVERTISE */}"), code.indexOf("{/* RECEIPTS & CERTIFICATES */}"));

const newBlock = `{/* META ADVERTISE */}
           {activeSection === 'meta' && (
              <div className="flex w-full h-[calc(100vh-140px)]">
                {/* ChatGPT Style Left Sidebar */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0">
                  <div className="p-4 border-b border-slate-200">
                    <button className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                      <Plus size={16} /> New Ad
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <div className="text-xs font-bold text-slate-400 mb-2 px-2">Recent Ads</div>
                    <div className="flex flex-col gap-1">
                      {savedMetaAds.length > 0 ? savedMetaAds.map((ad, i) => (
                        <div key={i} className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-200/50 cursor-pointer truncate">
                          {ad.prompt || \`Ad \${i+1}\`}
                        </div>
                      )) : (
                        <div className="px-2 text-xs text-slate-400">No saved ads yet</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-white relative">
                  
                  {/* Top Area: Selectors */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white z-10">
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Language</span>
                       <select 
                         value={metaLanguage} 
                         onChange={e => setMetaLanguage(e.target.value)}
                         className="bg-slate-100 text-sm font-bold text-slate-700 px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                       >
                         {metaLanguagesList.map(l => <option key={l} value={l}>{l}</option>)}
                       </select>
                       <button onClick={handleAddLanguage} className="text-slate-400 hover:text-indigo-600 p-1"><Plus size={14}/></button>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform</span>
                       <select 
                         value={metaPlatform} 
                         onChange={e => setMetaPlatform(e.target.value)}
                         className="bg-slate-100 text-sm font-bold text-slate-700 px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                       >
                         {metaPlatformsList.map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                       <button onClick={handleAddPlatform} className="text-slate-400 hover:text-indigo-600 p-1"><Plus size={14}/></button>
                     </div>
                  </div>

                  {/* Middle Area: Chat / Generated Output */}
                  <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                    {!generatedAiImage && !generatedAiText ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                         <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                           <ImageIcon className="text-slate-300 h-8 w-8" />
                         </div>
                         <h3 className="text-xl font-bold text-slate-600 mb-2">How can I help you advertise today?</h3>
                         <p className="text-sm">Describe your ad below or upload a base image to get started.</p>
                      </div>
                    ) : (
                      <div className="max-w-3xl mx-auto w-full">
                        {generatedAiImage && (
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col items-center">
                            <img src={generatedAiImage} alt="Generated" className="max-w-md w-full rounded-xl shadow-sm mb-4" />
                            <div className="flex gap-4 w-full justify-center">
                               <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2">
                                 <Share2 size={16} /> Open in Canva
                               </button>
                               <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                                 <Download size={16} /> Download Image
                               </button>
                            </div>
                          </div>
                        )}
                        {generatedAiText && (
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                             <h4 className="font-bold text-slate-800 mb-2">Generated Copy</h4>
                             <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{generatedAiText}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Area: Input Row */}
                  <div className="p-4 bg-white border-t border-slate-100">
                     <div className="max-w-4xl mx-auto w-full bg-slate-50 border border-slate-200 rounded-2xl flex flex-col p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                        <textarea 
                          className="w-full bg-transparent p-3 text-slate-700 min-h-[60px] max-h-[200px] outline-none resize-none"
                          placeholder="Message Canva Studio AI..."
                          value={metaPrompt}
                          onChange={e => setMetaPrompt(e.target.value)}
                        />
                        <div className="flex items-center justify-between p-2 border-t border-slate-200 mt-2">
                           <div className="flex items-center gap-3">
                             <label className="text-slate-400 hover:text-indigo-600 cursor-pointer p-1.5 hover:bg-indigo-50 rounded-lg transition-colors" title="Upload Image from PC">
                               <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                  if(e.target.files && e.target.files[0]){
                                    const reader = new FileReader();
                                    reader.onload = (e) => setGeneratedAiImage(e.target?.result as string);
                                    reader.readAsDataURL(e.target.files[0]);
                                  }
                               }} />
                               <Upload size={20} />
                             </label>
                             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                               <span className="text-xs font-bold text-slate-400">Canva ID (Optional)</span>
                               <input 
                                 type="text" 
                                 className="w-32 bg-transparent text-xs font-mono outline-none text-slate-700"
                                 placeholder="e.g. hd9r4z1rp2m"
                                 value={metaTemplatesMap[metaPlatform] || ''}
                                 onChange={e => handleUpdateTemplate(e.target.value)}
                               />
                             </div>
                           </div>
                           
                           <button 
                             onClick={handleGenerateMetaAI}
                             disabled={isGeneratingMeta || !metaPrompt.trim()}
                             className={\`p-2.5 rounded-xl transition-all flex items-center justify-center \${(!metaPrompt.trim() || isGeneratingMeta) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}\`}
                           >
                             {isGeneratingMeta ? (
                               <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                             ) : (
                               <Send size={18} />
                             )}
                           </button>
                        </div>
                     </div>
                     <div className="text-center mt-2 text-xs text-slate-400">
                       Canva Studio AI can make mistakes. Consider verifying important information.
                     </div>
                  </div>
                  
                </div>
              </div>
           )}

           `;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
console.log("Successfully replaced Meta Advertise layout!");
