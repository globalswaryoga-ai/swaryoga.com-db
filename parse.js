const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('app/admin/crm/new-registration/page.tsx', 'utf-8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("No syntax errors found by babel.");
} catch (e) {
  console.error("Syntax Error at line", e.loc.line, "col", e.loc.column);
  console.error(e.message);
}
