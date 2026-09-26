const fs = require('fs');
const ts = require('typescript');
const code = fs.readFileSync('app/admin/crm/new-registration/page.tsx', 'utf8');
const sf = ts.createSourceFile('page.tsx', code, ts.ScriptTarget.Latest, true);

let found = false;
function visit(node) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    if (node.getText(sf).includes('Workshop Registration Form')) {
      if (!found) {
        console.log("FOUND!");
        let p = node.parent;
        let d = 0;
        while (p && d < 10) {
          console.log(`Parent ${d}: ${ts.SyntaxKind[p.kind]}`);
          if (ts.isJsxExpression(p)) {
             console.log("JSX Expression text: " + p.getText(sf).substring(0, 100));
          }
          p = p.parent;
          d++;
        }
        found = true;
      }
    }
  }
  ts.forEachChild(node, visit);
}
visit(sf);
