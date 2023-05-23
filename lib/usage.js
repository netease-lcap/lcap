const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();
const glob = require('glob');

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

function getUsage(dir) {
    let desc = null;
    if (fs.existsSync(dir)) {
        desc = yaml.load(fs.readFileSync(path.join(dir, 'api.yaml')).toString());
    } else {
        throw new Error(`${dir} api.yaml not exist`);
    }
    let pkg = {};
    if (fs.existsSync(path.join(dir, 'package.json'))) {
        pkg = require(path.join(dir, 'package.json'));
    }
    if (~pkg.name.indexOf('-')) {
        throw new Error(`package.json name cannot contain '-' ,you can use '_'`);
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

    const frontends = [];
    const pcComponents = [];
    const h5Components = [];
    const pcLogics = [];
    const h5Logics = [];
    desc.forEach((item) => {
        if (item.belong === 'component') {
            const com = {
                concept: 'ViewComponent',
                name: item.name,
                title: item.title,
                category: `${pkg.name}(${pkg.title})`,
                blocks,
                attrs: item.attrs,
                themes: item.themes,
                events: item.events,
                slots: item.slots,
                methods: item.methods,
                children: item.children,
            };
            if (item.type === 'h5') {
                h5Components.push(com);
            } else {
                pcComponents.push(com);
            }
        } else if (item.belong === 'logic') {
            const logic = {
                concept: 'Logic',
                name: item.name,
                category: pkg.name,
                params: item.params,
                returns: item.returns,
            };
            if (item.type === 'h5') {
                h5Logics.push(logic);
            } else {
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
    }

    if (h5Components.length || h5Logics.length) {
        frontends.push({
            concept: 'FrontendLibrary',
            name: 'h5',
            type: 'h5',
            viewComponents: h5Components,
            logics: h5Logics,
        });
    }

    return {
        name: pkg.name.replace(/-/g, '_'),
        title: pkg.title,
        description: pkg.description,
        specVersion: '1.0.0',
        type: 'module',
        subType: 'extension',
        version: pkg.version,
        frontends,
    };
}

function getNewUsage(dir) {
    const fileList = glob.sync('*(components|logics)/**/api.yaml', {});
    const descList = fileList.map((item) => yaml.load(fs.readFileSync(item)));
    let pkg = {};
    if (fs.existsSync(path.join(dir, 'package.json'))) {
        pkg = require(path.join(dir, 'package.json'));
    }
    const res = assignUsage(descList.flat(Infinity), pkg);
    return res;
}

function assignUsage(list, pkg) {
    const frontends = [];
    const pcComponents = [];
    const h5Components = [];
    const pcLogics = [];
    const h5Logics = [];
    list.forEach((item) => {
        if (item.belong === 'component') {
            const com = {
                concept: 'ViewComponent',
                name: item.name,
                title: item.title,
                category: `${pkg.name}(${pkg.title})`,
                blocks: '',
                attrs: item.attrs,
                themes: item.themes,
                events: item.events,
                slots: item.slots,
                methods: item.methods,
                children: item.children,
            };
            if (item.type === 'h5') {
                h5Components.push(com);
            } else {
                pcComponents.push(com);
            }
        } else if (item.belong === 'logic') {
            const logic = {
                concept: 'Logic',
                name: item.name,
                category: pkg.name,
                params: item.params,
                returns: item.returns,
            };
            if (item.type === 'h5') {
                h5Logics.push(logic);
            } else {
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
    }

    if (h5Components.length || h5Logics.length) {
        frontends.push({
            concept: 'FrontendLibrary',
            name: 'h5',
            type: 'h5',
            viewComponents: h5Components,
            logics: h5Logics,
        });
    }

    return ({
        name: pkg.name.replace(/-/g, '_'),
        title: pkg.title,
        description: pkg.description,
        specVersion: '1.0.0',
        type: 'module',
        subType: 'extension',
        version: pkg.version,
        frontends,
    });
}

module.exports = {
    getNewUsage,
    getUsage,
};
