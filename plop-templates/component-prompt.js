const path = require('path');
const fs = require('fs');
const { upperFirst, camelCase, kebabCase } = require('lodash');
const pkg = require('../package.json');

module.exports = {
    description: '创建组件',
    prompts: [
        {
            type: 'input',
            name: 'name',
            message: '请输入组件名字',
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
            type: 'list',
            name: 'type',
            message: '请选择端',
            default: 'pc',
            choices: [
                { value: 'pc', name: 'PC端' },
                { value: 'h5', name: 'H5端' },
                { value: 'both', name: '全部' },
            ],
        },
    ],
    actions: (data) => {
        const relationPath = path.resolve(process.cwd(), './components');
        const makeFileList = ['index.vue', 'index.js', 'api.yaml', 'docs/blocks.md', 'docs/examples.md'];

        const actions = [...makeFileList.map((item) => ({
            type: 'add',
            path: `${relationPath}/{{dashCase name}}/${item}`,
            templateFile: `plop-templates/components/${item}.hbs`,
            data: {
                dashCaseName: kebabCase(data.name),
                camelCaseName: upperFirst(camelCase(data.name)),
            },
        })), {
            path: path.resolve(process.cwd(), './index.js'),
            pattern: /(\/\/ COMPONENT IMPORTS)/g,
            template: 'import {{pascalCase name}} from \'./components/{{name}}\';\n$1',
            type: 'modify',
        },
        {
            path: path.resolve(process.cwd(), './index.js'),
            pattern: /(\/\/ COMPONENT EXPORTS)/g,
            template: '\t{{pascalCase name}},\n$1',
            type: 'modify',
        },
        {
            path: path.resolve(process.cwd(), './vusion.config.js'),
            pattern: /(\/\/ Conponents Route List)/g,
            template: '{ group: \'组件\', name: \'{{kebabCase name}}\',path: "./components/{{kebabCase name}}/api.yaml"},,\n            $1',
            type: 'modify',
        },
        ];

        return actions;
    },
};
