const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('/tmp/leads_component.tsx', 'utf-8');
try {
  // We need to wrap it in a fragment since it might be a partial JSX
  parser.parse('<>' + code + '</>', {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("No syntax errors found by babel.");
} catch (e) {
  console.error("Syntax Error at line", e.loc.line, "col", e.loc.column);
  console.error(e.message);
}
