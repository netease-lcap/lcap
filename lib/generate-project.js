const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const ora = require('ora');
const { promptInstallUI, installLcapUI } = require('./install');
const { LCAP_UI } = require('./constants');
const logger = require('./logger');

function copyFolder(sourceFolder, destinationFolder, info) {
  if (!fs.existsSync(sourceFolder)) {
    return;
  }

  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder, { recursive: true });
  }

  fs.readdirSync(sourceFolder).forEach((file) => {
      const sourceFilePath = `${sourceFolder}/${file}`;

      if (file.startsWith('_')) {
        file = '.' + file.substring(1);
      }

      const destinationFilePath = `${destinationFolder}/${file}`;
      if (fs.lstatSync(sourceFilePath).isDirectory()) {
          copyFolder(sourceFilePath, destinationFilePath, info);
      } else {
          const buffer = fs.readFileSync(sourceFilePath, 'utf8');
          fs.writeFileSync(destinationFilePath, buffer.toString().replace(/\{\{LIBRARY_NAME\}\}/g, info.name));
      }
  });
}

async function getLcapInfo(framework) {
  const { useLcap } = await inquirer.prompt([{
    type: 'confirm',
    name: 'useLcap',
    message: 'Whether to add codewave UI package(是否添加 codewave 基础组件包)?',
    default: false,
  }])

  if (!useLcap) {
    return;
  }

  const uiInfo = await promptInstallUI();

  return {
    [LCAP_UI]: {
      ...uiInfo,
      framework,
    },
  }
}


module.exports = async ({ templatePath, basePath, info }) => {
  const lcapInfo = await getLcapInfo(info.framework);
  const spinner = ora(`开始创建项目...`).start();
  try {
    copyFolder(templatePath, basePath, info);
    const pkg = require(path.resolve(basePath, 'package.json'));
    pkg.name = info.name;
    pkg.title = info.title;
    pkg.description = info.title;
    pkg.version = '1.0.0';
    if (lcapInfo) {
      pkg.lcap = {
        ...(pkg.lcap || {}),
        ...lcapInfo,
      };
    }
    await fs.outputFile(path.resolve(basePath, 'package.json'), JSON.stringify(pkg, null, 2));
    
    if (lcapInfo && lcapInfo[LCAP_UI]) {
      await installLcapUI({
        ...lcapInfo[LCAP_UI],
      }, path.resolve(process.cwd(), info.path));
    }

    spinner.succeed();
  } catch(e) {
    spinner.stop();
    logger.error(`创建项目失败，${e.message}`);
    process.exit(1);
  }
};