const semver = require("semver");
const axios = require("axios");
const fs = require("fs-extra");
const path = require('path');
const download = require("./download.js");
const compressing = require("compressing");
const shelljs = require("shelljs");
const inquirer = require('inquirer');
const utils = require("./utils");
const configurator = require('./config.js');
const { copyFolder } = require("./fs-utils");
const { getComponentList } = require('./project');
const logger = require('./logger');
const {
  UI_PREFIX,
  PACKAGE_FILE_NAME,
  MAINIFEST_FILE_NAME,
  DEFAULT_MANIFEST,
  DIST_FOLDER,
  LCAP_MODULES,
  LCAP_UI,
  LCAP_MODULE_FILE_NAME,
} = require("./constants");

const http = axios.create({ url: "" });
function getFileURL(staticURL, libInfo, filePath) {
  return [staticURL, UI_PREFIX, libInfo, filePath].join("/");
}

function getLcapUIFilePath(filePath) {
  return [LCAP_MODULES, LCAP_UI, filePath].join("/");
}

function getLcapUILibInfo({ framework, type, version, pkgName }) {
  if (pkgName) {
    return `${pkgName}@${version}`;
  }
  if (framework === "react") {
    return `@lcap/pc-react-ui@${version}`;
  }

  if (type === "h5") {
    return `@lcap/mobile-ui@${version}`;
  }

  if (semver.lt(version, "1.0.0")) {
    return `cloud-ui.vusion@${version}`;
  }

  return `@lcap/pc-ui@${version}`;
}

async function getManifest(staticURL, libInfo) {
  let response;
  try {
    response = await http.get(
      getFileURL(staticURL, libInfo, MAINIFEST_FILE_NAME),
      {
        responseType: "json",
        responseEncoding: "utf8",
      },
    );
    if (response.status !== 200 || !response.data) {
      throw new Error("Unfound manifest.json");
    }
  } catch (e) {
    try {
      response = await http.get(
        getFileURL(staticURL, libInfo, `dist-theme/${MAINIFEST_FILE_NAME}`),
        {
          responseType: "json",
          responseEncoding: "utf8",
        },
      );

      if (response.status !== 200 || !response.data) {
        throw new Error("Unfound manifest.json");
      }
    } catch (e) {
      return {
        ...DEFAULT_MANIFEST,
      };
    }
  }

  return response.data;
}

async function downloadPackage(env, rootPath = process.cwd()) {
  if (!env) {
    const pkgInfo = fs.readJSONSync(path.resolve(rootPath, 'package.json'));
  
    if (!pkgInfo || !pkgInfo.lcap || !pkgInfo.lcap[LCAP_UI]) {
      return;
    }

    env = pkgInfo.lcap[LCAP_UI];
  }

  const { platform, type, version, framework, pkgName } = env;  
  const staticURL = await utils.getPlatformStatic(platform);
  const libInfo = getLcapUILibInfo({ framework, version, type, pkgName });

  const tempPath = path.resolve(rootPath, '_temp');
  await compressing.tgz.uncompress(
    await download(getFileURL(staticURL, libInfo, PACKAGE_FILE_NAME)),
    tempPath,
  );

  copyFolder(path.resolve(rootPath, '_temp/package/'), path.resolve(rootPath, getLcapUIFilePath("package")));

  shelljs.rm("-rf", tempPath);
}

const Vue2UseCode =
`import * as LcapUI from 'virtual-lcap:lcap-ui';
Vue.use(LcapUI);`;

const Vue3UseCode =
`import { setup as setupLcapUI } from '@storybook/vue3';
import { install } from 'virtual-lcap:lcap-ui';

setupLcapUI((app) => {
  app.use({
    install,
  });
});
`;

async function resetPreviewJS(framework, rootPath) {
  let preivewJSPath = path.resolve(rootPath, '.storybook/preview.js');
  if (!fs.existsSync(preivewJSPath)) {
    preivewJSPath = path.resolve(rootPath, '.storybook/preview.ts');
    if (!fs.existsSync(preivewJSPath)) {
      return;
    }
  }

  const code = fs.readFileSync(preivewJSPath, 'utf-8');

  if (code.indexOf('virtual-lcap:lcap-ui') !== -1) {
    return;
  }

  const codes = code.split('\n');
  codes.unshift('import \'virtual-lcap:lcap-ui.css\';');
  if (framework && framework.startsWith('vue')) {
    const insertIndex = codes.findIndex((str) => !str.startsWith('import'));
    const code = framework === 'vue2' ? Vue2UseCode : Vue3UseCode;
    codes.splice(insertIndex, 0, code);
  }

  fs.writeFileSync(preivewJSPath, codes.join('\n'));
}

async function resetTypings(rootPath, manifest) {
  const dtsPath = (manifest.modules || []).find((n) => n.endsWith('index.d.ts'));
  const typingPath = path.resolve(rootPath, 'src/typings.d.ts');
  if (!fs.existsSync(typingPath)) {
    return;
  }

  const code = fs.readFileSync(typingPath).toString();

  if (code.indexOf('virtual-lcap:lcap-ui') !== -1) {
    return;
  }

  let typingCode;

  if (dtsPath) {
    typingCode = [
      code,
      'declare module \'virtual-lcap:lcap-ui\' {',
      `  export * from '@lcap-ui/${dtsPath}';`,
      '}',
      '',
    ].join('\n');
  } else {
    const components = getComponentList(null, rootPath);

    const names = [];
    components.forEach((c) => {
      names.push(c.name);
      if (c.children && c.children.length > 0) {
        c.children.forEach((child) => {
          names.push(child.name);
        });
      }
    });
  
    typingCode = [
      code,
      'declare module \'virtual-lcap:lcap-ui\' {',
      ...names.map((name) => `  export const ${name}: any;`),
      '}',
      '',
    ].join('\n');
  }
 

  fs.writeFileSync(typingPath, typingCode, 'utf-8');
}

async function installLcapUI({ platform, framework, version, type, pkgName }, rootPath = process.cwd()) {
  const lcapUIPath = path.resolve(rootPath, [LCAP_MODULES, LCAP_UI].join('/'));
  if (fs.existsSync(lcapUIPath)) {
    shelljs.rm('-rf', lcapUIPath);
  }
  if (!platform) {
    platform = configurator.get('platform');
  }

  const staticURL = await utils.getPlatformStatic(platform);
  const libInfo = getLcapUILibInfo({ framework, version, type, pkgName });

  // 获取manifest
  const manifest = await getManifest(staticURL, libInfo);
  // 下载 manifest 中的 nasl、runtime 文件到 lcap_modules
  const files = [];
  try {
    await Promise.all(
      []
        .concat(manifest.nasl || [])
        .concat(manifest.runtime || [])
        .concat((manifest.theme || []).filter((str) => str.endsWith(".json")))
        .concat((manifest.i18n || []).filter((str) => str.endsWith(".json")))
        .concat((manifest.style || []).filter((str) => str.endsWith(".json")))
        .map(async (filePath) => {
          files.push([DIST_FOLDER, path.basename(filePath)].join('/'));
  
          await download(
            getFileURL(staticURL, libInfo, filePath),
            path.resolve(rootPath, getLcapUIFilePath(DIST_FOLDER)),
          );
        }),
    );
  } catch (e) {
    logger.error(e);
    logger.error(`下载文件失败 ${JSON.stringify(files)}`)
    throw e;
  }

  const env = { platform, framework, version, type, pkgName };
  fs.writeJSONSync(
    path.resolve(rootPath, getLcapUIFilePath(LCAP_MODULE_FILE_NAME)),
    {
      files,
      modules: (manifest.modules || []).find((s) => s.endsWith('modules.json')) || '',
      env: {
        framework,
        platform,
        version,
        type,
        pkgName,
      },
    },
    { spaces: 2 },
  );

  await downloadPackage(env, rootPath);
  await resetPreviewJS(framework, rootPath);
  await resetTypings(rootPath, manifest);
}

async function promptInstallUI() {
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'platform',
      message: 'Please input codewave platform address (请输入平台地址)',
      default: configurator.get('platform'),
      validate(platform) {
        return !!platform && platform.startsWith('http');
      },
      filter(val) {
        if (val.startsWith('https')) {
          return val.replace('https', 'http');
        }
        return val;
      },
    },
    {
      type: 'list',
      name: 'type',
      message: 'Please select type (请选择端)',
      default: 'pc',
      choices: [
        { value: 'pc', name: 'PC端' },
        { value: 'h5', name: 'H5端' },
      ],
    },
    {
      type: 'input',
      name: 'version',
      message: 'Please input codewave ui version (请输入组件库版本号，ide 左下角可查看组件库版本)',
      default: '1.0.0',
      validate(version) {
        return !!semver.valid(version);
      },
    },
  ]);

  return answer;
}

module.exports = {
  installLcapUI,
  downloadPackage,
  promptInstallUI,
};
