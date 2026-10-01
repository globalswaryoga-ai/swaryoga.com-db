const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

const oldBlock = `                 {/* Meta Ad Studio Area */}
                 {downloadTab === 'meta' && (
                   <div className="flex flex-col gap-12 w-full pb-12 items-center justify-center pt-8">
                     <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-8 w-full max-w-3xl">
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
                           <div>`;

const newBlock = `                 {/* Meta Ad Studio Area */}
                 {downloadTab === 'meta' && (
                   <div className="flex gap-8 w-full pb-12 pt-8">
                     
                     {/* Sidebar for Languages */}
                     <div className="w-72 flex-shrink-0">
                       <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm sticky top-6">
                         <div className="flex items-center justify-between mb-6">
                           <h4 className="font-black text-slate-800 text-lg">Languages</h4>
                           <button onClick={handleAddLanguage} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Add Language">
                             <Plus size={20} />
                           </button>
                         </div>
                         <div className="flex flex-col gap-2">
                           {metaLanguagesList.map(lang => (
                             <div 
                               key={lang} 
                               className={\`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors \${metaLanguage === lang ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-50 text-slate-600 font-medium border border-transparent'}\`} 
                               onClick={() => setMetaLanguage(lang)}
                             >
                               <span>{lang}</span>
                               {metaLanguagesList.length > 1 && (
                                 <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleEditLanguage(lang); }} 
                                     className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 p-1.5 rounded mr-1"
                                     title="Edit Language"
                                   >
                                     <Edit2 size={14} />
                                   </button>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleDeleteLanguage(lang); }} 
                                     className="text-slate-400 hover:text-red-600 hover:bg-red-100 p-1.5 rounded"
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
                     </div>

                     {/* Main Area */}
                     <div className="flex-1 max-w-3xl">
                       {/* Platform Tabs */}
                       <div className="flex gap-2 mb-6 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
                         {metaPlatformsList.map(plat => (
                           <button 
                             key={plat} 
                             onClick={() => setMetaPlatform(plat)}
                             className={\`px-6 py-2.5 rounded-xl text-sm font-bold transition-all \${metaPlatform === plat ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}\`}
                           >
                             {plat}
                           </button>
                         ))}
                       </div>

                       <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-8 w-full">
                          <div className="flex flex-col gap-6 w-full">
                           <div>`;

if(code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find block to replace.");
}
