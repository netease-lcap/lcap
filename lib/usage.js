const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();

module.exports = function (dir) {
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

    // return {
    //     symbol: desc.name,
    //     name: desc.title,
    //     version: pkg.version,
    //     icon: desc.icon,
    //     scope: desc.scope,
    //     scenes: desc.scenes,
    //     industry: desc.industry,
    //     repoAddr: desc.repoAddr || (typeof pkg.repository === 'string' ? pkg.repository : JSON.stringify(pkg.repository)),
    //     document: desc.document || pkg.document,
    //     depDescription: {
    //         ...desc.depDescription,
    //         ...pkg.vusionDependencies,
    //     },
    //     description: desc.description || pkg.description,
    //     // screenShot: JSON.stringify(screenShot),
    //     // blocks: JSON.stringify(blocks),
    //     jsonSchema: {
    //         name: desc.name,
    //         title: desc.title,
    //         description: desc.description || pkg.description,
    //         category: desc.title,
    //         control: desc.control,
    //         // screenShot: screenShot.length ? JSON.stringify(screenShot) : '',
    //         // drawings: drawings.length ? JSON.stringify(drawings) : '',
    //         blocks,
    //         attrs: desc.attrs,
    //         slots: desc.slots,
    //         methods: desc.methods,
    //         events: desc.events,
    //         children: (desc.children || []).map((child) => ({
    //             name: child.name,
    //             title: child.title,
    //             description: child.description,
    //             control: child.control,
    //             attrs: child.attrs,
    //             slots: child.slots,
    //             events: child.events,
    //         })),
    //     },
    // };
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
                category: `${item.name}(${pkg.title})`,
                blocks,
                attrs: item.attrs,
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
};
