const path = require('path');
const { upperFirst, camelCase, kebabCase } = require('lodash');
const { getComponentList, getLcapUIInfo } = require('../../lib/project');

const list = getComponentList();
const lcapUIInfo = getLcapUIInfo();

const prompts = [
    {
        type: 'input',
        name: 'name',
        message: '请输入组件名字（使用大驼峰方式命名，例如：TreeSelect）',
        validate: (v) => {
            if (!v || v.trim === '') {
                return '组件名字不能为空';
            } else {
                return true;
            }
        },
        when: (answers) => !answers.overloadBaseUI,
        filter(val) {
            return upperFirst(camelCase(val).trim());
        },
    },
    {
        type: 'input',
        name: 'title',
        message: '请输入别名(中文名)，例如：树形选择器',
        validate: (v) => {
            if (!v || v.trim === '') {
                return '别名不能为空';
            } else {
                return true;
            }
        },
        when: (answers) => !answers.overloadBaseUI,
        filter(val) {
            return val.trim();
        },
    },
    {
        type: 'list',
        name: 'type',
        message: '请选择端',
        default: 'pc',
        when: (answers) => !answers.overloadBaseUI,
        choices: [
            { value: 'pc', name: 'PC端' },
            { value: 'h5', name: 'H5端' },
            { value: 'both', name: '全部' },
        ],
    },
];

if (list.length > 0) {
    prompts.unshift({
        type: 'list',
        name: 'overloadBaseUI',
        message: 'Whether overload base component? (是否重载基础组件)',
        default: '',
        pageSize: 30,
        choices: [
            { value: '', name: 'None(不重载)' },
            ...list.map((it) => ({ value: it.name, name: `${it.name}(${it.title})`})),
        ],
    }, {
        type: 'input',
        name: 'prefix',
        message: 'Please Input overload prefix? (请输入重载名称前缀，例如 ex)',
        when: (answers) => !!answers.overloadBaseUI,
        default: 'ex',
        filter: (val) => {
            if (!val) {
                return 'ex';
            }
            return val.trim().toLowerCase();
        }
    }, {
        type: 'confirm',
        name: 'fork',
        message: 'Whether to fork component source code ？(是否复制基础组件源代码)\n复制组件源码后，该组件将完全独立，无法继续跟随基础组件能力升级变化，请慎重处理；\n 命令执行完成后请重新执行 npm install 装包',
        when: (answers) => !!answers.overloadBaseUI && (!lcapUIInfo.pkgName || ['@lcap/pc-ui', 'cloud-ui.vusion', '@lcap/mobile-ui'].includes(lcapUIInfo.pkgName)),
        default: false,
    });
};

module.exports = {
    description: '创建组件',
    prompts,
    actions: (data) => {
        if (data.overloadBaseUI) {
            const comp = list.find((it) => it.name === data.overloadBaseUI);
            data.name = upperFirst(data.prefix) + data.overloadBaseUI;
            data.title = comp ? comp.title : '';
            data.type = lcapUIInfo ? lcapUIInfo.type : 'pc';
        }
        const pkg = require(path.resolve(process.cwd(), 'package.json'));
        const relationPath = path.resolve(process.cwd(), './src/components');
        const makeFileList = ['index.ts', 'index.vue', 'api.ts', 'stories/block.stories.js', 'stories/example.stories.js'];

        const compName = upperFirst(camelCase(data.name));
        const tagName = kebabCase(data.name);

        const actions = [...makeFileList.map((item) => ({
            type: 'add',
            path: `${relationPath}/${tagName}/${item}`,
            templateFile: path.resolve(__dirname, `component/${item}.hbs`),
            data: {
              compName,
              tagName,
              title: data.title,
              description: data.title,
              pkgName: pkg.name,
              group: '',
            },
        })), {
            path: path.resolve(process.cwd(), './src/components/index.ts'),
            pattern: /(\/\/ COMPONENT IMPORTS)/g,
            template: `import ${compName} from './${tagName}';\n$1`,
            type: 'modify',
        },
        {
            path: path.resolve(process.cwd(), './src/components/index.ts'),
            pattern: /(\/\/ COMPONENT EXPORTS)/g,
            template: `  ${compName},\n$1`,
            type: 'modify',
        },
        ];

        if (data.overloadBaseUI) {
            actions.push({
                type: 'overloadBaseUI',
                component: data.overloadBaseUI,
                fork: data.fork,
                prefix: data.prefix,
            });
        }

        return actions;
    },
};
