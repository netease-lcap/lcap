const fs = require('fs-extra');
const path = require('path');
const logger = require("./logger");
const { LCAP_MODULES, LCAP_UI } = require('./constants');
const { downloadPackage } = require('./install');
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
    if (!fs.existsSync(path.resolve(cwd, [LCAP_MODULES, LCAP_UI, 'package'].join('/')))) {
      await downloadPackage();
    }
    command.push('--fork');
  }

  if (config.name) {
    command.push(`--name=${config.name}`);
  }

  await exec(command.join(' '));

  return 'successed!';
}

module.exports = {
  overloadBaseUI,
};