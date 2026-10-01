const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

// 1. Add Message type and state
const stateMarker = `  const [metaPrompt, setMetaPrompt] = useState<string>('');`;
const newMessageState = `  type ChatMessage = { role: 'user' | 'ai'; content: string; imageUrl?: string | null; error?: boolean };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [metaPrompt, setMetaPrompt] = useState<string>('');`;
code = code.replace(stateMarker, newMessageState);

// 2. Update handleGenerateMetaAI to use chatMessages
const handleGenStart = `    setIsGeneratingMeta(true);
    setGeneratedAiText(null);
    setGeneratedAiImage(null);
    setGeneratedDesignId(null);
    setMetaError(null);`;

const newHandleGenStart = `    setIsGeneratingMeta(true);
    setGeneratedAiText(null);
    setGeneratedAiImage(null);
    setGeneratedDesignId(null);
    setMetaError(null);
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: metaPrompt }]);
    const currentPrompt = metaPrompt;
    setMetaPrompt('');`;

code = code.replace(handleGenStart, newHandleGenStart);

// Update prompt references in fetch
code = code.replace(
  "const fullPrompt = `Target Language: ${metaLanguage}\\nPlatform: ${metaPlatform}\\n\\n${metaPrompt}`;",
  "const fullPrompt = `Target Language: ${metaLanguage}\\nPlatform: ${metaPlatform}\\n\\n${currentPrompt}`;"
);
code = code.replace("prompt: metaPrompt,", "prompt: currentPrompt,");


const handleGenSuccess = `      if (data.generatedText) {
        setGeneratedAiText(\`Headline: \${data.generatedText.Headline}\\n\\nSubheading: \${data.generatedText.Subheading}\\n\\nCTA: \${data.generatedText.CTA}\`);
      }
      
      if (data.imageUrl) {
        setGeneratedAiImage(data.imageUrl);
      }
      
      // We auto-save the generated ad to history
      const newAd = {`;

const newHandleGenSuccess = `      const aiText = data.generatedText ? \`Headline: \${data.generatedText.Headline}\\n\\nSubheading: \${data.generatedText.Subheading}\\n\\nCTA: \${data.generatedText.CTA}\` : '';
      
      if (data.generatedText) {
        setGeneratedAiText(aiText);
      }
      
      if (data.imageUrl) {
        setGeneratedAiImage(data.imageUrl);
      }
      
      // Add AI response to chat
      setChatMessages(prev => [...prev, { role: 'ai', content: aiText, imageUrl: data.imageUrl }]);
      
      // We auto-save the generated ad to history
      const newAd = {`;
code = code.replace(handleGenSuccess, newHandleGenSuccess);

// Remove the setMetaPrompt('') at the end since we do it early
code = code.replace(`      if (typeof window !== 'undefined') localStorage.setItem('saved_meta_ads', JSON.stringify(updatedAds));\n      \n      setMetaPrompt('');`, `      if (typeof window !== 'undefined') localStorage.setItem('saved_meta_ads', JSON.stringify(updatedAds));`);

// Update error catch
const handleError = `    } catch (error: any) {
      setMetaError(error.message);
    }`;
const newHandleError = `    } catch (error: any) {
      setMetaError(error.message);
      setChatMessages(prev => [...prev, { role: 'ai', content: error.message, error: true }]);
    }`;
code = code.replace(handleError, newHandleError);


// 3. Render chatMessages in Middle Area
const chatAreaStart = `{/* Middle Area: Chat / Generated Output */}`;
const chatAreaEnd = `{/* Bottom Area: Input Row */}`;

const newChatArea = `{/* Middle Area: Chat / Generated Output */}
                  <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-white">
                    <div className="max-w-3xl mx-auto space-y-6 flex flex-col justify-end min-h-full">
                      
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 my-auto">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <Sparkles size={32} className="text-indigo-400" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-700">What would you like to create today?</h3>
                          <p className="text-sm">Enter a prompt below to generate an ad copy and image.</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div key={idx} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
                            <div className={\`max-w-[80%] rounded-2xl p-4 \${
                              msg.role === 'user' 
                                ? 'bg-slate-100 text-slate-800' 
                                : msg.error 
                                  ? 'bg-red-50 text-red-600 border border-red-200' 
                                  : 'bg-transparent text-slate-700'
                            }\`}>
                               {msg.role === 'ai' && !msg.error && (
                                 <div className="flex items-center gap-2 mb-3">
                                   <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                     <Sparkles size={14} className="text-indigo-600" />
                                   </div>
                                   <span className="font-bold text-sm">Canva Studio AI</span>
                                 </div>
                               )}
                               
                               {msg.imageUrl && (
                                 <div className="mb-4">
                                   <img src={msg.imageUrl} alt="Generated" className="rounded-xl max-w-sm w-full border border-slate-200 shadow-sm" />
                                   <div className="mt-3 flex gap-2">
                                     <button className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2">
                                       <Share2 size={14} /> Open in Canva
                                     </button>
                                     <button className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                       <Download size={14} /> Download
                                     </button>
                                   </div>
                                 </div>
                               )}
                               
                               <div className="whitespace-pre-wrap leading-relaxed text-sm">
                                 {msg.content}
                               </div>
                            </div>
                          </div>
                        ))
                      )}
                      
                      {isGeneratingMeta && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] rounded-2xl p-4 bg-transparent text-slate-700">
                             <div className="flex items-center gap-2 mb-3">
                               <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center animate-pulse">
                                 <Sparkles size={14} className="text-indigo-600" />
                               </div>
                               <span className="font-bold text-sm">Canva Studio AI is thinking...</span>
                             </div>
                             <div className="flex space-x-2">
                               <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                               <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                               <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                             </div>
                          </div>
                        </div>
                      )}
                      
                    </div>
                  </div>
                  
                  {/* Bottom Area: Input Row */}`;

const startIndex = code.indexOf(chatAreaStart);
const endIndex = code.indexOf(chatAreaEnd);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newChatArea + code.substring(endIndex + chatAreaEnd.length);
  fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
  console.log("Success");
} else {
  console.log("Could not find block");
}
