const semver = require("semver");
const axios = require("axios");
const fs = require("fs-extra");
const path = require('path');
const download = require("download");
const compressing = require("compressing");
const shelljs = require("shelljs");
const inquirer = require('inquirer');
const utils = require("./utils");
const configurator = require('./config.js');
const { copyFolder } = require("./fs-utils");
const { getComponentList } = require('./project');
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

function getLcapUILibInfo({ framework, type, version }) {
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

async function downloadPackage(env) {
  if (!env) {
    const pkgInfo = fs.readJSONSync(path.resolve(process.cwd(), 'package.json'));
  
    if (!pkgInfo || !pkgInfo.lcap || !pkgInfo.lcap[LCAP_UI]) {
      return;
    }

    env = pkgInfo.lcap[LCAP_UI];
  }

  const { platform, type, version, framework } = env;  
  const staticURL = await utils.getPlatformStatic(platform);
  const libInfo = getLcapUILibInfo({ framework, version, type });

  await compressing.tgz.uncompress(
    await download(getFileURL(staticURL, libInfo, PACKAGE_FILE_NAME)),
    "_temp",
  );

  copyFolder("_temp/package/", getLcapUIFilePath("package"));

  shelljs.rm("-rf", "_temp");
}

async function resetPreviewJS(framework, rootPath) {
  const preivewJSPath = path.resolve(rootPath, '.storybook/preview.js');
  if (!fs.existsSync(preivewJSPath)) {
    return;
  }

  const code = fs.readFileSync(preivewJSPath, 'utf-8');

  if (code.indexOf('virtual-lcap:lcap-ui') !== -1) {
    return;
  }

  const codes = code.split('\n');
  codes.unshift('import \'virtual-lcap:lcap-ui.css\';');
  if (framework && framework.startsWith('vue')) {
    const insertIndex = codes.findIndex((str) => !str.startsWith('import'));
    codes.splice(insertIndex, 0, 'import * as LcapUI from \'virtual-lcap:lcap-ui\';\nVue.use(LcapUI);')
  }

  fs.writeFileSync(preivewJSPath, codes.join('\n'));
}

async function resetTypings(rootPath) {
  const typingPath = path.resolve(rootPath, 'src/typings.d.ts');
  if (!fs.existsSync(typingPath)) {
    return;
  }

  const code = fs.readFileSync(typingPath).toString();

  if (code.indexOf('virtual-lcap:lcap-ui') !== -1) {
    return;
  }

  const components = getComponentList();
  const names = [];
  components.forEach((c) => {
    names.push(c.name);
    if (c.children && c.children.length > 0) {
      c.children.forEach((child) => {
        names.push(child.name);
      });
    }
  });

  const typingCode = [
    code,
    'declare module \'virtual-lcap:lcap-ui\' {',
    ...names.map((name) => `  export const ${name}: any;`),
    '}',
    '',
  ].join('\n');

  fs.writeFileSync(typingPath, typingCode, 'utf-8');
}

async function installLcapUI({ platform, framework, version, type }, rootPath = process.cwd()) {
  shelljs.rm('-rf', [LCAP_MODULES, LCAP_UI].join('/'));
  if (!platform) {
    platform = configurator.get('platform');
  }

  const staticURL = await utils.getPlatformStatic(platform);
  const libInfo = getLcapUILibInfo({ framework, version, type });

  // 获取manifest
  const manifest = await getManifest(staticURL, libInfo);
  // 下载 manifest 中的 nasl、runtime 文件到 lcap_modules
  const files = [];
  await Promise.all(
    []
      .concat(manifest.nasl || [])
      .concat(manifest.runtime || [])
      .concat((manifest.theme || []).filter((str) => str.endsWith(".json")))
      .concat((manifest.i18n || []).filter((str) => str.endsWith(".json")))
      .map(async (filePath) => {
        files.push([DIST_FOLDER, path.basename(filePath)].join('/'));

        await download(
          getFileURL(staticURL, libInfo, filePath),
          path.resolve(rootPath, getLcapUIFilePath(DIST_FOLDER)),
        );
      }),
  );

  const env = { platform, framework, version, type };
  fs.writeJSONSync(
    path.resolve(rootPath, getLcapUIFilePath(LCAP_MODULE_FILE_NAME)),
    {
      files,
      env: {
        framework,
        platform,
        version,
        type,
      },
    },
    { spaces: 2 },
  );

  await downloadPackage(env);
  await resetPreviewJS(framework, rootPath);
  await resetTypings(rootPath);
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
