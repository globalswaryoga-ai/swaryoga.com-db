const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

// 1. Add state for popup
if (!code.includes('const [showCanvaPopup, setShowCanvaPopup]')) {
  code = code.replace(
    "const [metaPrompt, setMetaPrompt] = useState<string>('');",
    "const [metaPrompt, setMetaPrompt] = useState<string>('');\\n  const [showCanvaPopup, setShowCanvaPopup] = useState(false);"
  );
}

// 2. Replace the Bottom Area Input Row
const oldInputAreaStart = `{/* Bottom Area: Input Row */}`;
const oldInputAreaEnd = `<div className="text-center mt-2 text-xs text-slate-400">
                       Canva Studio AI can make mistakes. Consider verifying important information.
                     </div>
                  </div>`;
                  
const newInputArea = `{/* Bottom Area: Input Row */}` + `
                  <div className="p-4 bg-transparent relative z-20">
                     <div className="max-w-3xl mx-auto w-full relative">
                     
                        {/* Canva ID Popup */}
                        {showCanvaPopup && (
                          <div className="absolute bottom-full mb-4 left-4 bg-white border border-slate-200 shadow-xl rounded-xl p-4 w-72 animate-in fade-in slide-in-from-bottom-2 z-50">
                            <h4 className="text-sm font-bold text-slate-800 mb-2">Canva Template Settings</h4>
                            <div className="mb-3">
                              <label className="text-xs font-semibold text-slate-500 mb-1 block">Template ID for {metaPlatform}</label>
                              <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. hd9r4z1rp2m"
                                value={metaTemplatesMap[metaPlatform] || ''}
                                onChange={e => handleUpdateTemplate(e.target.value)}
                              />
                            </div>
                            <button onClick={() => setShowCanvaPopup(false)} className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Done</button>
                          </div>
                        )}
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-full flex items-center p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                          
                          {/* Left Icons */}
                          <div className="flex items-center gap-1 pl-2">
                             <label className="text-slate-400 hover:text-indigo-600 cursor-pointer p-2 hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0" title="Upload Image">
                               <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                  if(e.target.files && e.target.files[0]){
                                    const reader = new FileReader();
                                    reader.onload = (e) => setGeneratedAiImage(e.target?.result as string);
                                    reader.readAsDataURL(e.target.files[0]);
                                  }
                               }} />
                               <Plus size={24} />
                             </label>
                             <button 
                               onClick={() => setShowCanvaPopup(!showCanvaPopup)}
                               className={\`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors flex-shrink-0 \${showCanvaPopup ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}\`}
                               title="Canva Settings"
                             >
                               C
                             </button>
                          </div>
                          
                          {/* Input */}
                          <input 
                            className="flex-1 bg-transparent px-4 py-3 text-slate-700 outline-none text-base"
                            placeholder="Message Canva Studio AI..."
                            value={metaPrompt}
                            onChange={e => setMetaPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleGenerateMetaAI();
                              }
                            }}
                          />
                          
                          {/* Right Button */}
                          <button 
                            onClick={handleGenerateMetaAI}
                            disabled={isGeneratingMeta || !metaPrompt.trim()}
                            className={\`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 mr-1 \${(!metaPrompt.trim() || isGeneratingMeta) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}\`}
                          >
                            {isGeneratingMeta ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                        </div>
                     </div>
                     <div className="text-center mt-3 text-xs text-slate-400">
                       Canva Studio AI can make mistakes. Consider verifying important information.
                     </div>
                  </div>`;
                  
const startIndex = code.indexOf(oldInputAreaStart);
const endIndex = code.indexOf(oldInputAreaEnd) + oldInputAreaEnd.length;

if (startIndex !== -1 && code.indexOf(oldInputAreaEnd) !== -1) {
  code = code.substring(0, startIndex) + newInputArea + code.substring(endIndex);
  fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
  console.log("Success");
} else {
  console.log("Could not find block");
}
