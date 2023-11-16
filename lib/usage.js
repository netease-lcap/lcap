const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();
const glob = require('glob');
const capitalize = require('lodash').capitalize;

const removeDeprecated = function (component) {
    if (component.events) {
        component.events = component.events.map((item) => {
            if (item.description === '@deprecated') {
                return null;
            }
            if (item.deprecated === true) {
                return null;
            }
            return item;
        }).filter((i) => i);
    }
    if (component.attrs) {
        component.attrs = component.attrs.map((item) => {
            if (item.description === '@deprecated') {
                return null;
            }
            if (item.deprecated === true) {
                return null;
            }
            return item;
        }).filter((i) => i);
    }
};
const hasImg = function (dir) {
    return fs.existsSync(path.join(dir, '0.png'));
};

const hasSvg = function (dir) {
    return fs.existsSync(path.join(dir, '0.svg'));
};
/* 获取blocks */
const getBlock = (dir) => {
    const blocks = [];

    const blockPath = path.join(dir, 'docs/blocks.md');
    if (fs.existsSync(blockPath)) {
        const tokens = md.parse(fs.readFileSync(blockPath).toString());
        let title = '';
        let description = '';
        tokens.forEach((token, index) => {
            if (token.type === 'heading_close' && token.tag === 'h3') {
                const inline = tokens[index - 1];
                if (inline && inline.type === 'inline')
                    title = inline.content;
            } else if (token.type === 'paragraph_close') {
                const inline = tokens[index - 1];
                if (inline && inline.type === 'inline')
                    description += inline.content + '\n';
            } else if (token.type === 'fence') {
                const lang = token.info.trim().split(' ')[0];

                if (lang === 'html') {
                    blocks.push({
                        title,
                        description,
                        code: `<template>\n${token.content}</template>`,
                    });
                } else if (lang === 'vue') {
                    blocks.push({
                        title,
                        description,
                        code: token.content,
                    });
                }
                description = '';
            }
        });
    }
    return blocks;
};

let pkg = null;
function getNewUsage(dir) {
    const fileList = glob.sync(`*(components|logics)/**/api.yaml`, {
        root: dir,
    });
    if (!fileList.length) {
        return '';
    }
    if (fs.existsSync(path.join(dir, 'package.json'))) {
        pkg = require(path.join(dir, 'package.json'));
    }
    const descList = fileList.map((item) => {
        const obj = yaml.load(fs.readFileSync(item));
        if (~item.indexOf('logics') && !obj[0].params) {
            const types = getLogicAttr(item);
            return Object.assign(obj[0], types);
        } else {
            const blocks = getBlock(path.resolve(item, '../'));
            obj[0].blocks = blocks;
            return obj;
        }
    });
    const resStructure = getStructure();
    const res = assignUsage(descList.flat(1), pkg);
    return Object.assign(res, resStructure);
}
/* 获取数据结构 */
function getStructure() {
    const strPath = path.resolve(process.cwd(), 'structure/index.json');
    const isFile = fs.existsSync(strPath);
    if (!isFile) {
        return;
    }
    const resultList = [];
    const structureList = require(strPath);
    Object.keys(structureList).forEach((item) => {
        const resultObj = {};
        resultObj.name = item;
        const structureData = structureList[item];
        const resultStructureList = Object.keys(structureData).map((it) => {
            const structureOpions = structureData[it];
            if (it === '__description') {
                resultObj.description = structureOpions;
                return null;
            } else {
                const list = structureOpions.split('-');
                const obj = {
                    title: list[1],
                    name: it,
                    defaultValue: list[2] || undefined,
                    typeAnnotation: formatTypeAnnotation(list[0]),
                };
                return obj;
            }
        });
        resultObj.properties = resultStructureList.filter((item) => !!item);
        resultList.push(resultObj);
    });

    return ({
        structures: resultList,
    });
}
/* 找到逻辑对应的文件 */
function getLogicAttr(dir) {
    const p = path.resolve(dir, '../index.js');
    const data = fs.readFileSync(p).toString();
    if (data) {
        const targetList = getTargeData(data);
        const targetData = formatTypeData(targetList);
        return targetData;
    }
}
/* 获取有用的备注信息 */
function getTargeData(data) {
    const list = /\/\*\*([\s\S]*)\*\//.exec(data);
    let result = null;
    if (list) {
        const code = list[0].split('\n').slice(1, -1);
        result = code.map((item) => item.match(/(@param|@returns)\s{(\S*)}\s(\S*)\s?(<[\S\s]*>)?\s?([\S\s]*)?/));
    }
    return result || [];
}
/* 获取数据类型 */
function formatTypeAnnotation(type) {
    const typeAnnotation = {
        concept: 'TypeAnnotation',
    };
    const resultArr = /(\[([\s\S]*)\])/.exec(type);
    const resultMap = /(<([\s\S]*,[\s\S]*)>)/.exec(type);
    if (resultArr) {
        typeAnnotation.typeName = 'List';
        typeAnnotation.typeKind = 'generic';
        typeAnnotation.typeNamespace = 'nasl.collection';
        typeAnnotation.typeArguments = [];
        typeAnnotation.typeArguments[0] = formatTypeAnnotation(resultArr[2]);
    } else if (resultMap) {
        const resultMapList = resultMap[2].split(',');
        typeAnnotation.typeName = 'Map';
        typeAnnotation.typeKind = 'generic';
        typeAnnotation.typeNamespace = 'nasl.collection';
        typeAnnotation.typeArguments = [];
        typeAnnotation.typeArguments[0] = formatTypeAnnotation(resultMapList[0]);
        typeAnnotation.typeArguments[1] = formatTypeAnnotation(resultMapList[1]);
    } else {
        const baseTypeList = ['Long', 'Boolean', 'Decimal', 'String', 'Date', 'DateTime', 'Time'];
        const targeType = capitalize(type);
        if (baseTypeList.includes(targeType)) {
            typeAnnotation.typeKind = 'primitive';
            typeAnnotation.typeName = targeType;
            typeAnnotation.typeNamespace = 'nasl.core';
        } else {
            typeAnnotation.typeKind = 'reference';
            typeAnnotation.typeName = targeType;
            typeAnnotation.typeNamespace = `extensions.${pkg.name}.structures`;
        }
    }
    return typeAnnotation;
}
/* 根据注释生成nasl节点 */
function formatTypeData(list) {
    const resultData = {
        params: undefined,
        returns: undefined,
    };
    list.forEach((item) => {
        if (!item) {
            return;
        }
        if (item[1] === '@param') {
            const obj = {
                name: item[3],
                concept: capitalize(item[1].slice(1)),
                description: item[5],
                required: item[4] ? JSON.parse(item[4].slice(1, -1)) : false,
                typeAnnotation: formatTypeAnnotation(item[2]),
            };
            resultData.params = resultData.params || [];
            resultData.params.push(obj);
        } else if (item[1] === '@returns') {
            const obj = {
                name: item[3],
                description: item[4],
                concept: 'Return',
                typeAnnotation: formatTypeAnnotation(item[2]),
            };
            resultData.returns = resultData.returns || [];
            resultData.returns.push(obj);
        }
    });
    return resultData;
}
/* 组成前端的usage数据 */
function assignUsage(list, pkg) {
    const frontends = [];
    const pcComponents = [];
    const h5Components = [];
    const pcLogics = [];
    const h5Logics = [];
    const summary = {
        name: pkg.name,
        title: pkg.title,
        version: pkg.version,
        description: pkg.description,
        frontends: [],
    };
    list.forEach((item) => {
        if (item.belong === 'component') {
            const com = {
                concept: 'ViewComponent',
                name: item.name,
                title: item.title,
                category: `${pkg.name}(${pkg.title})`,
                blocks: item.blocks,
                attrs: item.attrs,
                themes: item.themes,
                events: item.events,
                slots: item.slots,
                methods: item.methods,
                children: item.children,
            };
            if (item.type === 'h5') {
                h5Components.push(com);
            } else if (item.type === 'pc') {
                pcComponents.push(com);
            } else {
                h5Components.push(com);
                pcComponents.push(com);
            }
        } else if (item.belong === 'logic') {
            const logic = {
                concept: 'Logic',
                name: item.name,
                description: item.description,
                category: pkg.name,
                params: item.params,
                returns: item.returns,
            };
            if (item.type === 'h5') {
                h5Logics.push(logic);
            } else if (item.type === 'pc') {
                pcLogics.push(logic);
            } else {
                h5Logics.push(logic);
                pcLogics.push(logic);
            }
        }
    });

    if (pcComponents.length || pcLogics.length) {
        frontends.push({
            concept: 'FrontendLibrary',
            name: 'pc',
            type: 'pc',
            viewComponents: pcComponents,
            logics: pcLogics,
        });
        summary.frontends.push({
            type: 'pc',
            viewComponents: pcComponents.map((item) => ({
                name: item.name,
                title: item.title,
                description: item.description,
            })),
            logics: pcLogics.map((item) => ({
                name: item.name,
                description: item.description,
            })),
        });
    }

    if (h5Components.length || h5Logics.length) {
        frontends.push({
            concept: 'FrontendLibrary',
            name: 'h5',
            type: 'h5',
            viewComponents: h5Components,
            logics: h5Logics,
        });
        summary.frontends.push({
            type: 'h5',
            viewComponents: h5Components.map((item) => ({ [item.name]: item.title })),
            logics: h5Logics.map((item) => ({ [item.name]: item.description })),
        });
    }

    const usageData = {
        name: pkg.name,
        title: pkg.title,
        description: pkg.description,
        specVersion: '1.0.0',
        type: 'module',
        subType: 'extension',
        version: pkg.version,
        frontends,
        summary,
    };
    if (pkg.lcapVersion === '0.3.0') {
        usageData.compilerInfoMap = {
            js: {
                prefix: 'extension',
            },
        };
        usageData.ideVersion = '3.2';
    }

    return usageData;
}

function getUsage(dir) {
    let desc = null;
    if (fs.existsSync(dir)) {
        desc = yaml.load(fs.readFileSync(path.join(dir, 'api.yaml')).toString());
    } else {
        throw new Error(`${dir} api.yaml not exist`);
    }
    if (Array.isArray(desc)) {
        desc.forEach((item) => {
            removeDeprecated(item);
        });
        if (desc.length > 1) {
            const tmp = desc;
            desc = tmp.shift();
            desc.children = tmp;
        } else {
            desc = desc[0];
        }
    }
    let pkg = {};
    if (fs.existsSync(path.join(dir, 'package.json'))) {
        pkg = require(path.join(dir, 'package.json'));
    }
    const labels = desc.labels;
    if (!labels) {
        throw new Error(`${desc.name} labels not exist`);
    }
    const blocks = [];

    const blockPath = path.join(dir, 'docs/blocks.md');
    if (fs.existsSync(blockPath)) {
        const tokens = md.parse(fs.readFileSync(blockPath).toString());
        let title = '';
        let description = '';
        tokens.forEach((token, index) => {
            if (token.type === 'heading_close' && token.tag === 'h3') {
                const inline = tokens[index - 1];
                if (inline && inline.type === 'inline')
                    title = inline.content;
            } else if (token.type === 'paragraph_close') {
                const inline = tokens[index - 1];
                if (inline && inline.type === 'inline')
                    description += inline.content + '\n';
            } else if (token.type === 'fence') {
                const lang = token.info.trim().split(' ')[0];

                if (lang === 'html') {
                    blocks.push({
                        title,
                        description,
                        code: `<template>\n${token.content}</template>\n`,
                    });
                } else if (lang === 'vue') {
                    blocks.push({
                        title,
                        description,
                        code: token.content,
                    });
                }
                description = '';
            }
        });
    }

    let screenShot = [];
    const screenShotPath = path.join(dir, 'screenshots');
    if (hasImg(screenShotPath)) {
        screenShot = fs.readdirSync(screenShotPath)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .filter((filename) => filename.indexOf('.DS_Store') === -1);
    }

    let drawings = [];
    const drawingsPath = path.join(dir, 'drawings');
    if (hasSvg(drawingsPath)) {
        drawings = fs.readdirSync(drawingsPath)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .filter((filename) => filename.indexOf('.DS_Store') === -1);
    }

    return {
        symbol: desc.name,
        name: desc.title,
        version: pkg.version,
        icon: desc.icon,
        scope: desc.scope,
        scenes: desc.scenes,
        industry: desc.industry,
        repoAddr: desc.repoAddr || (typeof pkg.repository === 'string' ? pkg.repository : JSON.stringify(pkg.repository)),
        document: desc.document || pkg.document,
        depDescription: {
            ...desc.depDescription,
            ...pkg.vusionDependencies,
        },
        description: desc.description || pkg.description,
        labels,
        screenShot: JSON.stringify(screenShot),
        blocks: JSON.stringify(blocks),
        jsonSchema: {
            name: desc.name,
            title: desc.title,
            description: desc.description || pkg.description,
            category: desc.labels[0],
            control: desc.control,
            screenShot: screenShot.length ? JSON.stringify(screenShot) : '',
            drawings: drawings.length ? JSON.stringify(drawings) : '',
            blocks,
            attrs: desc.attrs,
            slots: desc.slots,
            methods: desc.methods,
            events: desc.events,
            themes: desc.themes,
            children: (desc.children || []).map((child) => ({
                name: child.name,
                title: child.title,
                description: child.description,
                control: child.control,
                attrs: child.attrs,
                slots: child.slots,
                events: child.events,
                themes: child.themes,
            })),
        },
    };
}

module.exports = {
    getNewUsage,
    getUsage,
};
