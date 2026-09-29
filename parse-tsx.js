const ts = require("typescript");
const fs = require("fs");

const fileName = "app/admin/crm/broadcast/page.tsx";
const sourceFile = ts.createSourceFile(
  fileName,
  fs.readFileSync(fileName, "utf8"),
  ts.ScriptTarget.Latest,
  true
);

let unclosed = [];
function visit(node) {
  if (ts.isJsxElement(node)) {
    const openTag = node.openingElement.tagName.getText();
    const closeTag = node.closingElement.tagName.getText();
    if (openTag !== closeTag) {
      console.log(`Mismatch: open <${openTag}>, close </${closeTag}> at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
console.log("Done checking JSX Element mismatch");
