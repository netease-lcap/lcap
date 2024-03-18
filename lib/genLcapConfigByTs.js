const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');
const { cli: logger } = require('vusion-api');
const { transform } = require('./transforms/naslTs2Json');
const snippetCode2NASL = require('./transforms/snippetCode2NASL');
const transformStory2Blocks = require('./transforms/story2block');

function hasImg(dir) {
  return fs.existsSync(path.join(dir, '0.png'));
}
function hasSvg(dir) {
  return fs.existsSync(path.join(dir, '0.svg'));
}

function getScreenShot(
  componentDir,
  compName,
  libInfo,
  sourceDir,
  publicPath,
) {
  let screenShot = [];
  try {
    const screenShotPath = `${componentDir}/screenshots`;
    if (hasImg(screenShotPath)) {
      screenShot = fs
        .readdirSync(screenShotPath)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .filter((filename) => filename.indexOf('.DS_Store') === -1);
      screenShot = screenShot.map((screen) => {
        const prefix = [publicPath, libInfo, sourceDir].join('/');
        return `${prefix}/${compName}/screenshots/${screen}`;
      });
    }
  } catch (e) {
    logger.warn(`找不到 screenShot 文件 ${componentDir}/screenshots`);
    // console.log(e);
  }
  return screenShot;
}

function getDrawings(componentDir, compName, libInfo, sourceDir, publicPath) {
  let drawings = [];
  try {
    const drawingsPath = `${componentDir}/drawings`;
    if (hasSvg(drawingsPath)) {
      drawings = fs
        .readdirSync(drawingsPath)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .filter((filename) => filename.indexOf('.DS_Store') === -1);
      drawings = drawings.map((drawing) => {
        const prefix = [publicPath, libInfo, sourceDir].join('/');
        return `${prefix}/${compName}/drawings/${drawing}`;
      });
    }
  } catch (e) {
    logger.warn(`找不到 drawings 文件 ${componentDir}/drawings`);
  }
  return drawings;
}

function getBlocksByDemo(componentDir, { screenshots, drawings }) {
  const dir = `${componentDir}/demos/blocks`;
  if (!fs.existsSync(dir)) {
    logger.warn('未找到 blocks: ', dir);
    return [];
  }

  const files = fs.readdirSync(dir).filter((p) => p.endsWith('.vue'));
  const blocks = [];
  files.forEach((file, index) => {
    let content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const matches = content.match(/<!--.*?-->/);
    let title = '';
    if (matches.length > 0) {
      title = matches[0].replace(/<!--/, '').replace(/-->/, '').trim();
      content = content.replace(/<!--.*?-->/, '');
    }

    const code = content.split('\n').map((s) => s.trim()).filter((s) => !!s).join('\n');
    blocks.push({
      concept: 'ViewBlockWithImage',
      title,
      description: '',
      code,
      screenshot: screenshots[index] || '',
      drawing: drawings[index] || '',
    });
  });

  return blocks;
}

function getBlocksByStory(componentDir, { screenshots, drawings }) {
  let storyFilePath = `${componentDir}/stories/block.stories`;
  if (fs.existsSync(storyFilePath + '.jsx')) {
    storyFilePath = storyFilePath + '.jsx';
  } else if (fs.existsSync(storyFilePath + '.tsx')) {
    storyFilePath = storyFilePath + '.tsx';
  } else if (fs.existsSync(storyFilePath + '.js')) {
    storyFilePath = storyFilePath + '.js';
  } else {
    logger.warn(`未找到blocks 文件, ${storyFilePath}`);
    return [];
  }

  const code = fs.readFileSync(storyFilePath);
  const blocks = transformStory2Blocks(code.toString());

  return blocks.map(({ name, template }, index) => ({
    concept: 'ViewBlockWithImage',
    title: name,
    description: '',
    code: template,
    screenshot: screenshots[index] || '',
    drawing: drawings[index] || '',
  }));
}

function getNaslByAPITS(tsPath, { isReactFrameWork, sourceDir, libInfo, assetsPublicPath }) {
  if (!fs.existsSync(tsPath)) {
    logger.error(`未找到组件的描述文件 ${tsPath} `);
    process.exit(1);
  }

  const componentDir = tsPath.substring(0, tsPath.lastIndexOf('/api.ts'));
  const compName = componentDir.substring(componentDir.lastIndexOf('/') + 1);

  const component = {};

  try {
    const info = transform(fs.readFileSync(tsPath, 'utf8'));
    Object.assign(component, info[0]);
    if (isReactFrameWork && component.slots && component.slots.length > 0) {
      component.slots.forEach((slotConfig) => {
        if (!slotConfig.snippets || slotConfig.snippets.length === 0) {
          return;
        }

        slotConfig.snippets = slotConfig.snippets.map((snippetConfig) => ({
          ...snippetConfig,
          code: snippetCode2NASL(snippetConfig.code),
        }));
      });
    }
  } catch (e) {
    logger.error(`解析 ${tsPath} 失败，${e.message}`);
    process.exit(1);
  }

  const screenshots = getScreenShot(
    componentDir,
    compName,
    libInfo,
    sourceDir,
    assetsPublicPath,
  );
  const drawings = getDrawings(
    componentDir,
    compName,
    libInfo,
    sourceDir,
    assetsPublicPath,
  );

  // blocks
  try {
    const blocks = isReactFrameWork ? getBlocksByStory(componentDir, { screenshots, drawings }) : getBlocksByDemo(componentDir, { screenshots, drawings });
    Object.assign(component, { blocks });
  } catch (e) {
    logger.error(`处理 block 异常 ${e.message}`);
  }

  return component;
}

function getPeerDependencies(pkgInfo) {
  if (!pkgInfo.peerDependencies) {
    return [];
  }

  return Object.keys(pkgInfo.peerDependencies).map((name) => {
    return {
      name,
      version: pkgInfo.peerDependencies[name],
    };
  });
}

module.exports = (rootPath, platformPath) => {
  const componentPath = path.join(rootPath, 'src/components');
  const pkgInfo = require(path.join(rootPath, 'package.json'));
  const isReactFrameWork = pkgInfo.peerDependencies && Object.keys(pkgInfo.peerDependencies).includes('react');
  const libInfo = [pkgInfo.name, '@', pkgInfo.version].join('');
  const viewComponents = glob.sync(`${componentPath}/**/api.ts`).map((tsPath) => getNaslByAPITS(tsPath, {
    isReactFrameWork,
    libInfo,
    sourceDir: componentPath,
    assetsPublicPath: `${platformPath}/packages/extension`,
  }));

  return {
    name: pkgInfo.name,
    title: pkgInfo.title,
    description: pkgInfo.description,
    specVersion: '1.0.0',
    type: 'module',
    subType: 'extension',
    version: pkgInfo.version,
    frontends: [{
      concept: 'FrontendLibrary',
      name: 'pc',
      type: 'pc',
      frameworkKind: isReactFrameWork ? 'react' : 'vue2',
      viewComponents,
      logics: [],
    }],
    externalDependencyMap: {
      npm: getPeerDependencies(pkgInfo),
    },
    summary: {
      name: pkgInfo.name,
      title: pkgInfo.title,
      version: pkgInfo.version,
      description: pkgInfo.description,
      frontends: [{
        type: 'pc',
        frameworkKind: isReactFrameWork ? 'react' : 'vue2',
        viewComponents: viewComponents.map((item) => ({
            name: item.name,
            title: item.title,
        })),
        logics: [],
       }],
    },
    compilerInfoMap: {
      js: {
        prefix: 'extension',
      },
    },
    ideVersion: pkgInfo.lcapIdeVersion || '3.6',
  };
};
