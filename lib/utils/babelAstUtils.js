const babelGenerator = require('@babel/generator');
const { cli: logger } = require('vusion-api');

const generator = babelGenerator.default;

const getNodeCode = (node) => {
  try {
    const { code: text = '' } = generator(node);
    return text.replace(/\n/g, ' ');
  } catch (e) {
    logger.warn(`生成code 错误，${JSON.stringify(node)}`);
  }
  return '';
};

const getJSXNameByNode = (node) => {
  if (!node || !node.name || node.name.type !== 'JSXIdentifier') {
    return '';
  }

  return node.name.name;
};

module.exports = {
  getNodeCode,
  getJSXNameByNode,
};
