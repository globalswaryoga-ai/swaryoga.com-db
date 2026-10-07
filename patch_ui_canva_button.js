const fs = require('fs');
const file = 'app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// The backend now adds a direct link in the aiText markdown: "✨ **[Click here to edit your design in Canva](...)**"
// We should also store designUrl in ChatMessage state and use it in the UI button if present.

// Add designUrl to ChatMessage type
code = code.replace(
  "type ChatMessage = { role: 'user' | 'ai'; content: string; imageUrl?: string | null; videoUrl?: string | null; error?: boolean };",
  "type ChatMessage = { role: 'user' | 'ai'; content: string; imageUrl?: string | null; videoUrl?: string | null; designUrl?: string | null; error?: boolean };"
);

// Add designUrl to state update
code = code.replace(
  "setChatMessages(prev => [...prev, { role: 'ai', content: aiText, imageUrl: data.imageUrl, videoUrl: data.videoUrl }]);",
  "setChatMessages(prev => [...prev, { role: 'ai', content: aiText, imageUrl: data.imageUrl, videoUrl: data.videoUrl, designUrl: data.designUrl }]);"
);

// Modify the 'Open in Canva' button to use designUrl if available, instead of the hacky copy-paste
const oldButton = `                                     <button 
                                       onClick={async () => {
                                         try {
                                           let blob: Blob;
                                           if (msg.imageUrl!.startsWith('data:')) {
                                             const parts = msg.imageUrl!.split(',');
                                             const byteString = atob(parts[1]);
                                             const mimeString = parts[0].split(':')[1].split(';')[0];
                                             const ab = new ArrayBuffer(byteString.length);
                                             const ia = new Uint8Array(ab);
                                             for (let i = 0; i < byteString.length; i++) {
                                               ia[i] = byteString.charCodeAt(i);
                                             }
                                             blob = new Blob([ab], { type: mimeString });
                                           } else {
                                             const response = await fetch(msg.imageUrl!);
                                             blob = await response.blob();
                                           }
                                           await navigator.clipboard.write([
                                             new ClipboardItem({ [blob.type]: blob })
                                           ]);
                                           if(confirm("Image copied to clipboard! Ready to paste (Ctrl+V) into Canva?")) {
                                             openCanvaPopup('https://www.canva.com/');
                                           }
                                         } catch(e) {
                                           alert("Could not copy automatically. Please right-click the image to copy it, then paste it in Canva.");
                                           openCanvaPopup('https://www.canva.com/');
                                         }
                                       }}
                                       className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2"
                                     >
                                       <Share2 size={14} /> Open in Canva
                                     </button>`;

const newButton = `                                     <button 
                                       onClick={async () => {
                                         if (msg.designUrl) {
                                            openCanvaPopup(msg.designUrl);
                                            return;
                                         }
                                         
                                         // Fallback if design generation failed but image generated
                                         try {
                                           let blob: Blob;
                                           if (msg.imageUrl!.startsWith('data:')) {
                                             const parts = msg.imageUrl!.split(',');
                                             const byteString = atob(parts[1]);
                                             const mimeString = parts[0].split(':')[1].split(';')[0];
                                             const ab = new ArrayBuffer(byteString.length);
                                             const ia = new Uint8Array(ab);
                                             for (let i = 0; i < byteString.length; i++) {
                                               ia[i] = byteString.charCodeAt(i);
                                             }
                                             blob = new Blob([ab], { type: mimeString });
                                           } else {
                                             const response = await fetch(msg.imageUrl!);
                                             blob = await response.blob();
                                           }
                                           await navigator.clipboard.write([
                                             new ClipboardItem({ [blob.type]: blob })
                                           ]);
                                           if(confirm("Image copied to clipboard! Ready to paste (Ctrl+V) into Canva?")) {
                                             openCanvaPopup('https://www.canva.com/');
                                           }
                                         } catch(e) {
                                           alert("Could not copy automatically. Please right-click the image to copy it, then paste it in Canva.");
                                           openCanvaPopup('https://www.canva.com/');
                                         }
                                       }}
                                       className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2"
                                     >
                                       <Share2 size={14} /> {msg.designUrl ? 'Edit in Canva' : 'Open in Canva'}
                                     </button>`;

code = code.replace(oldButton, newButton);

fs.writeFileSync(file, code);
console.log("Patched Canva UI button");
