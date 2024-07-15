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
const {
  UI_PREFIX,
  PACKAGE_FILE_NAME,
  MAINIFEST_FILE_NAME,
  DEFAULT_MANIFEST,
  DIST_FOLDER,
  LCAP_MODULES,
  LCAP_UI,
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

async function downloadPackage(staticURL, libInfo) {
  await compressing.tgz.uncompress(
    await download(getFileURL(staticURL, libInfo, PACKAGE_FILE_NAME)),
    "_temp",
  );

  copyFolder("_temp/package/", getLcapUIFilePath("package"));

  shelljs.rm("-rf", "_temp");
}

async function installLcapUI({ platform, framework, version, type }) {
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
  try {
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
            getLcapUIFilePath(DIST_FOLDER),
          );
        }),
    );
  } catch (e) {
    console.log(e);
  }

  fs.writeJSONSync(
    getLcapUIFilePath('lcap-module.json'),
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
