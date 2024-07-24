const fs = require('fs-extra');
const path = require('path');
const logger = require("./logger");
const { LCAP_MODULES, LCAP_UI } = require('./constants');
const { exec } = require('./exec');

const cwd = process.cwd();
async function overloadBaseUI(answers, config) {
  if (!config.component) {
    return;
  }

  if (!fs.existsSync(path.resolve(cwd, 'node_modules'))) {
    logger.error('请先执行 npm install 安装依赖');
    process.exit(1);
  }

  const command = ['npx lcap-scripts overload'];

  command.push(config.component);

  if (config.fork) {
    command.push('--fork');
  }

  if (config.prefix) {
    command.push(`--prefix=${config.prefix || 'ex'}`);
  }

  await exec(command.join(' '));

  return 'successed!';
}

module.exports = {
  overloadBaseUI,
};