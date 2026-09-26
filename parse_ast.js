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
        console.log("Found JSX Element containing the text!");
        let parent = node.parent;
        while (parent) {
          if (ts.isJsxExpression(parent) || ts.isConditionalExpression(parent) || ts.isBinaryExpression(parent) || ts.isIfStatement(parent)) {
            const txt = parent.getText(sourceFile);
            console.log("Condition/Expression Parent:", txt.substring(0, Math.min(100, txt.indexOf('\n'))));
          }
          parent = parent.parent;
        }
        found = true;
      }
    }
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);
