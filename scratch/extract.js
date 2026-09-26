const fs = require('fs');
const content = fs.readFileSync('app/admin/crm/new-registration/page.tsx', 'utf8');

const formsTabHeader = `              {/* TAB 2: Workshop Forms */}`;
const formsTabStart = content.indexOf(formsTabHeader);

const pickerStart = content.indexOf('<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">', formsTabStart);

// It ends at: Save & Map Data\n                      </button>\n                    </div>\n                  </div>
// Wait, the outer div that is closed there is the bg-white one.
// Let's just find the exact closing tag.
const searchStr = 'Save & Map Data\n                      </button>\n                    </div>';
const saveBtnStart = content.indexOf(searchStr, pickerStart);
const saveBtnEnd = saveBtnStart + searchStr.length;

// the actual block ends with `</div>` (the closing tag of `<div className="bg-white ...">`)
// In the original file, it was:
//                     <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shadow-inner z-10">
//                       <button ...>Save & Map Data</button>
//                     </div>
//                   </div>
const fullEndIndex = content.indexOf('</div>', saveBtnEnd) + 6;

const block = content.substring(pickerStart, fullEndIndex);
console.log("Block starts with:", block.substring(0, 50));
console.log("Block ends with:", block.substring(block.length - 50));

fs.writeFileSync('scratch/block.txt', block);
