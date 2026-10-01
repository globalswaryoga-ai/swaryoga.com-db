const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

// Replace the top navigation to point activeSection='meta'
code = code.replace(
  "onClick={() => {\\n                 setActiveSection('downloads');\\n                 setDownloadTab('meta');\\n               }}",
  "onClick={() => setActiveSection('meta')}"
);

// We need to update activeSection === 'meta' block
const metaSectionOld = `           {/* META WORK */}
           {activeSection === 'meta' && (
              <div className="max-w-4xl mx-auto flex flex-col h-full">
                 <div className="mb-8">
                   <h3 className="text-3xl font-black text-slate-800 tracking-tight">Meta Work Studio</h3>
                   <p className="text-slate-500 mt-2 text-lg">Create Facebook ads, YouTube thumbnails, and Instagram templates.</p>
                 </div>
                 
                 <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-6 overflow-hidden">
                    {isLoadingDesigns ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                        <p className="font-medium">Loading your Canva designs...</p>
                      </div>
                    ) : designError ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-red-400">
                        <Info size={24} className="mb-2" />
                        <p className="font-medium">{designError}</p>
                        <button 
                          onClick={() => window.location.href = '/api/admin/canva/oauth'}
                          className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm"
                        >
                          Reconnect Canva
                        </button>
                      </div>
                    ) : canvaDesigns.length > 0 ? (
                      <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-6">
                          {canvaDesigns.map((design, i) => (
                            <div key={design.id || i} className="group relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                              <div className="aspect-video bg-slate-200 relative">
                                {design.thumbnail?.url ? (
                                  <img src={design.thumbnail.url} alt={design.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="text-slate-400 h-8 w-8" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors"></div>
                              </div>
                              <div className="p-4">
                                <h5 className="font-bold text-slate-700 truncate">{design.title || 'Untitled Design'}</h5>
                                <p className="text-xs text-slate-500 mt-1">ID: {design.id}</p>
                              </div>
                              <a 
                                href={design.urls?.edit_url || \`https://canva.com/design/\${design.id}/edit\`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 bg-white/90 backdrop-blur text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                              >
                                Edit in Canva
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <ImageIcon className="h-20 w-20 text-indigo-100 mb-6" />
                        <h4 className="text-xl font-bold text-slate-700 mb-3">No Designs Found</h4>
                        <p className="text-slate-500 text-center max-w-md mb-8">
                          You don't have any designs in your Canva account yet, or the app doesn't have permission to view them.
                        </p>
                        <a href="https://canva.com" target="_blank" rel="noopener noreferrer" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                          Create a Design
                        </a>
                      </div>
                    )}
                 </div>
              </div>
           )}`;

const metaSectionNew = `           {/* META ADVERTISE */}
           {activeSection === 'meta' && (
              <div className="max-w-3xl mx-auto flex flex-col h-full items-center pt-8">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-8 w-full">
                  <div className="flex flex-col gap-6 w-full">
                     <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-slate-700 block">Languages</h4>
                          <button onClick={handleAddLanguage} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors" title="Add Language">
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {metaLanguagesList.map(lang => (
                            <div 
                              key={lang} 
                              className={\`group flex items-center justify-between px-4 py-2 rounded-xl cursor-pointer transition-colors \${metaLanguage === lang ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium border border-slate-200'}\`} 
                              onClick={() => setMetaLanguage(lang)}
                            >
                              <span>{lang}</span>
                              {metaLanguagesList.length > 1 && (
                                <div className="flex items-center ml-3 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleEditLanguage(lang); }} 
                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 p-1 rounded mr-1"
                                    title="Edit Language"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteLanguage(lang); }} 
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-100 p-1 rounded"
                                    title="Delete Language"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                     </div>

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
                       onClick={() => { setMetaPlatform('FB'); handleGenerateMetaAI(); }}
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
                     </button>
                  </div>
                </div>
              </div>
           )}`;

code = code.replace(metaSectionOld, metaSectionNew);
fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
