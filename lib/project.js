const fs = require('fs-extra');
const path = require('path');
const { LCAP_UI, LCAP_MODULES, LCAP_MODULE_FILE_NAME, LCAP_UI_CONFIG_FILE_NAME } = require('./constants');
const cwd = process.cwd();

function getFrameWorkKind(pkgInfo) {
  if (!pkgInfo) {
    pkgInfo = require(path.resolve(cwd, 'package.json'));
  }

  if (pkgInfo.peerDependencies && Object.keys(pkgInfo.peerDependencies).includes('@tarojs/taro')) {
    return 'taro';
  }

  if (pkgInfo.peerDependencies && Object.keys(pkgInfo.peerDependencies).includes('react')) {
    return 'react';
  }

  if (
    pkgInfo.peerDependencies
    && pkgInfo.peerDependencies.vue
    && (pkgInfo.peerDependencies.vue.startsWith('3.') || pkgInfo.peerDependencies.vue.startsWith('^3.'))
  ) {
    return 'vue3';
  }

  if (
    pkgInfo.peerDependencies
    && pkgInfo.peerDependencies.vue
    && (pkgInfo.peerDependencies.vue.startsWith('2.') || pkgInfo.peerDependencies.vue.startsWith('^2.'))
  ) {
    return 'vue2';
  }

  return '';
}

function isOldProject() {
  return fs.existsSync(path.resolve(cwd, 'vusion.config.js'));
}

function isLcapLibrary(pkgInfo) {
  if (!pkgInfo) {
    pkgInfo = require(path.resolve(cwd, 'package.json'));
  }
  return isOldProject() || ((pkgInfo.lcapIdeVersion || pkgInfo.lcap) && getFrameWorkKind(pkgInfo));
}

function getComponentList(pkgInfo) {
  if (!pkgInfo) {
    pkgInfo = require(path.resolve(cwd, 'package.json'));
  }

  if (!pkgInfo || !pkgInfo.lcap || !pkgInfo.lcap[LCAP_UI]) {
    return [];
  }

  const moduleConfigPath = path.resolve(cwd, LCAP_MODULES, LCAP_UI, LCAP_MODULE_FILE_NAME);
  if (!fs.existsSync(moduleConfigPath)) {
    return [];
  }

  try {
    const config = fs.readJSONSync(moduleConfigPath);
    const naslConfigPath = config.files.find((p) => p.endsWith(LCAP_UI_CONFIG_FILE_NAME));

    if (!naslConfigPath) {
      return [];
    }

    const arr = fs.readJSONSync(path.resolve(cwd, LCAP_MODULES, LCAP_UI, naslConfigPath));
    return Array.isArray(arr) ? arr.filter((c) => c.show !== false) : [];
  } catch(e) {
    return [];
  }
}

function getLcapUIInfo(pkgInfo) {
  if (!pkgInfo) {
    pkgInfo = require(path.resolve(cwd, 'package.json'));
  }

  if (!pkgInfo || !pkgInfo.lcap || !pkgInfo.lcap[LCAP_UI]) {
    return null;
  }

  return pkgInfo.lcap[LCAP_UI];
}

module.exports = {
  getFrameWorkKind,
  isOldProject,
  isLcapLibrary,
  getComponentList,
  getLcapUIInfo,
}