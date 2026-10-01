const fs = require('fs');
const filePath = 'app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "           {/* META WORK */}\n           {activeSection === 'meta' && (";
const endMarker = "           )}\n\n           {/* DOWNLOADS SECTION */}\n           {activeSection === 'downloads' && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find markers!");
  process.exit(1);
}

// Extract the block (without the start and end conditions)
const blockToMove = content.substring(startIndex + startMarker.length, endIndex);
// Actually it contains the closing `\n           )}` at the end which we should trim.
const metaUIContent = blockToMove.substring(0, blockToMove.lastIndexOf(')}')).trim();

// Remove the block from the original location
const contentWithoutMetaSection = content.substring(0, startIndex) + content.substring(endIndex + "           )}\n\n".length);

// Now find where to insert it
const insertMarker = "                 {/* Content Area */}\n                 {downloadTab === 'meta' ? (";
const insertIndex = contentWithoutMetaSection.indexOf(insertMarker);

if (insertIndex === -1) {
  console.log("Could not find insert marker!");
  process.exit(1);
}

const finalContent = contentWithoutMetaSection.substring(0, insertIndex + insertMarker.length) + 
  "\n                   <div className=\"flex flex-col gap-12 w-full\">\n" +
  "                     {/* Ad Studio Interface */}\n" +
  "                     " + metaUIContent + "\n" +
  "                     {/* Saved Ads Section */}\n" +
  contentWithoutMetaSection.substring(insertIndex + insertMarker.length);

// We need to also close the `<div className="flex flex-col gap-12 w-full">` wrapper at the end of the meta tab content
const endInsertMarker = "                     </div>\n                   </div>\n                 ) : (\n                   <div className=\"bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col\">";

const endInsertIndex = finalContent.indexOf(endInsertMarker);
if (endInsertIndex === -1) {
  console.log("Could not find end insert marker!");
  // Let's find it more robustly
  const fallbackMarker = "                   </div>\n                 ) : (";
  const fallbackIndex = finalContent.indexOf(fallbackMarker);
  if (fallbackIndex !== -1) {
     const repaired = finalContent.substring(0, fallbackIndex) + "\n                     </div>\n" + finalContent.substring(fallbackIndex);
     fs.writeFileSync(filePath, repaired);
     console.log("Success with fallback!");
     process.exit(0);
  }
  process.exit(1);
}

const repairedContent = finalContent.substring(0, endInsertIndex) + "\n                   </div>\n" + finalContent.substring(endInsertIndex);

fs.writeFileSync(filePath, repairedContent);
console.log("Success!");
