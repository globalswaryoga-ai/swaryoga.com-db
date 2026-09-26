const fs = require('fs');
const ts = require('typescript');
const code = fs.readFileSync('app/admin/crm/new-registration/page.tsx', 'utf8');
const sourceFile = ts.createSourceFile('page.tsx', code, ts.ScriptTarget.Latest, true);

let found = false;
function visit(node) {
  if (ts.isJsxElement(node)) {
    const text = node.getText(sourceFile);
    if (text.includes('Workshop Registration Form')) {
      if (!found) {
        let parent = node.parent;
        let pText = "";
        while (parent) {
          if (ts.isJsxExpression(parent)) {
            pText += parent.getText(sourceFile).substring(0, 100) + "\n";
          }
          parent = parent.parent;
        }
        console.log("Parents:\n" + pText);
        found = true;
      }
    }
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);
