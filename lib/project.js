const fs = require('fs-extra');
const path = require('path');
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

module.exports = {
  getFrameWorkKind,
  isOldProject,
  isLcapLibrary,
}