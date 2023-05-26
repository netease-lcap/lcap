const path = require('path');
const fs = require('fs');
const { upperFirst, camelCase, kebabCase } = require('lodash');
const pkg = require('../package.json');
module.exports = {
    description: '创建全局逻辑',
    prompts: [
        {
            type: 'input',
            name: 'name',
            message: '请输入逻辑名字',
            validate: (v) => {
                if (!v || v.trim === '') {
                    return '名称不能为空';
                } else {
                    return true;
                }
            },
        },
        {
            type: 'input',
            name: 'title',
            message: '请输入别名',
            validate: (v) => {
                if (!v || v.trim === '') {
                    return '文件名不能为空';
                } else {
                    return true;
                }
            },
        },
        {
            type: 'input',
            name: 'description',
            message: '请输入描述',
            default: '请在这里添加描述',
        },
    ],
    actions: (data) => {
        const relationPath = path.resolve(__dirname, '../logics');
        const indexjsPath = path.resolve(relationPath, 'index.js');
        const exist = fs.existsSync(indexjsPath);
        console.log(exist);
        const actions = [];
        if (!exist) {
            actions.push({
                type: 'add',
                path: `${relationPath}/index.js`,
                templateFile: `plop-templates/logics/main.js.hbs`,
                data: {
                    pkgName: pkg.name,
                },
            });
        }
        actions.push({
            type: 'add',
            path: `${relationPath}/{{dashCase name}}/index.js`,
            templateFile: `plop-templates/logics/index.js.hbs`,
        });
        actions.push({
            type: 'add',
            path: `${relationPath}/{{dashCase name}}/api.yaml`,
            templateFile: `plop-templates/logics/api.yaml.hbs`,
        });
        actions.push({
            path: indexjsPath,
            pattern: /(\/\/ LOGIC IMPORTS)/g,
            template: 'import {{name}} from \'./logics/{{name}}\'\n$1',
            type: 'modify',
        });
        actions.push({
            path: indexjsPath,
            pattern: /(\/\/ LOGIC USE)/g,
            template: 'Vue.prototype.$library[`${$libraryName}`].{{name}}={{name}}\n    $1',
            type: 'modify',
        });

        // const makeFileList = ["index.vue", "index.js", "api.yaml","docs/blocks.md", "docs/examples.md"]

        // const actions =  [...makeFileList.map(item => {
        //     return ({
        //         type: "add",
        //         path: `${relationPath}/{{dashCase name}}/${item}`,
        //         templateFile: `plop-templates/components/${item}.hbs`,
        //         data: {
        //             dashCaseName: kebabCase(data.name),
        //             camelCaseName: upperFirst(camelCase(data.name)),
        //         }
        //    })
        // }), {
        //     path: path.resolve(__dirname, "../index.js"),
        //     pattern: /(\/\/ COMPONENT IMPORTS)/g,
        //     template: 'import {{pascalCase name}} from \'./components/{{name}}\';\n$1',
        //     type: 'modify',
        //     },
        //     {
        //         path: path.resolve(__dirname, "../index.js"),
        //         pattern: /(\/\/ COMPONENT EXPORTS)/g,
        //         template: '\t{{pascalCase name}},\n$1',
        //         type: 'modify',
        //     },
        // ]

        return actions;
    },
};
