const path = require('path');
const fs = require('fs');
const { upperFirst, camelCase, kebabCase } = require('lodash');

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = require(pkgPath);

module.exports = {
    description: '创建前端切面',
    prompts: [
        {
            type: 'input',
            name: 'name',
            message: '请输入切面名字',
            validate: (v) => {
                if (!v || v.trim === '') {
                    return '名称不能为空';
                } else {
                    return true;
                }
            },
            filter(val) {
                return camelCase(val).trim();
            },
        },
        {
            type: 'input',
            name: 'description',
            message: '请输入描述',
            default: '请在这里添加描述',
            filter(val) {
                return val.trim();
            },
        },
        {
            type: 'list',
            name: 'type',
            message: '请选择端',
            default: 'pc',
            choices: [
                // { value: 'pc', name: 'PC端' },
                // { value: 'h5', name: 'H5端' },
                { value: 'both', name: '全部' },
            ],
        },
    ],
    actions: (data) => {
        const relationPath = path.resolve(process.cwd(), './annotations');
        const indexjsPath = path.resolve(relationPath, 'index.js');
        const indexData = fs.readFileSync(path.resolve(process.cwd(), 'index.js'));
        const exist = fs.existsSync(indexjsPath);
        const actions = [];
        if (!exist) {
            actions.push({
                type: 'add',
                path: `${relationPath}/index.js`,
                templateFile: `plop-templates/annotations/main.js.hbs`,
                data: {
                    pkgName: pkg.name,
                },
            });
        }
        if (!~indexData.indexOf('import AnnoLogics')) {
            actions.push({
                path: path.resolve(process.cwd(), './index.js'),
                pattern: /(\/\/ COMPONENT EXPORTS)/g,
                template: '\tAnnoLogics,\n$1',
                type: 'modify',
            });
            actions.push({
                path: path.resolve(process.cwd(), './index.js'),
                pattern: /(\/\/ COMPONENT IMPORTS)/g,
                template: 'import AnnoLogics from \'./annotations\';\n$1',
                type: 'modify',
            });
        }
        actions.push({
            type: 'add',
            path: `${relationPath}/{{camelCase name}}/index.js`,
            templateFile: `plop-templates/annotations/index.js.hbs`,
        });
        actions.push({
            type: 'add',
            path: `${relationPath}/{{camelCase name}}/api.yaml`,
            templateFile: `plop-templates/annotations/api.yaml.hbs`,
        });
        actions.push({
            path: indexjsPath,
            pattern: /(\/\/ LOGIC IMPORTS)/g,
            template: 'import {{camelCase name}} from \'./{{camelCase name}}\'\n$1',
            type: 'modify',
        });
        actions.push({
            path: indexjsPath,
            pattern: /(\/\/ LOGIC USE)/g,
            template: 'Vue.prototype.$library[`${$libraryName}`].{{camelCase name}}={{camelCase name}}\n    $1',
            type: 'modify',
        });
        return actions;
    },
};
