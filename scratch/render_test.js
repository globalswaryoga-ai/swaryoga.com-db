require('@babel/register')({
  presets: ['@babel/preset-env', ['@babel/preset-react', {runtime: 'automatic'}], '@babel/preset-typescript'],
  extensions: ['.ts', '.tsx']
});
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const Page = require('../app/admin/crm/new-registration/page.tsx').default;

try {
  console.log("Rendering...");
  const html = ReactDOMServer.renderToString(React.createElement(Page));
  console.log("Success! HTML length:", html.length);
} catch (e) {
  console.error("RENDER ERROR:");
  console.error(e.stack);
}
