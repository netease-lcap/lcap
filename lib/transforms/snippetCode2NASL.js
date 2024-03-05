const parser = require('@babel/parser');
const babelTraverse = require('@babel/traverse');
const reactJSX2NASL = require('../utils/reactJSX2NASL.js');

const traverse = babelTraverse.default;

module.exports = (code) => {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  let nasl = '';
  traverse(ast, {
    JSXElement: (p) => {
      nasl = reactJSX2NASL(p.node);
      p.stop();
    },
  });

  return nasl || code;
};
