const path = require('path');
const { camelCase } = require('lodash');

module.exports = {
    description: '创建逻辑',
    prompts: [
        {
            type: 'input',
            name: 'name',
            message: '请输入逻辑名称（使用小驼峰方式命名，例如：filterNull）',
            validate: (v) => {
                if (!v || v.trim === '') {
                    return '组件名字不能为空';
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
            name: 'title',
            message: '请输入别名(中文名): 过滤列表',
            validate: (v) => {
                if (!v || v.trim === '') {
                    return '别名不能为空';
                } else {
                    return true;
                }
            },
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
                { value: 'pc', name: 'PC端' },
                { value: 'h5', name: 'H5端' },
                { value: 'both', name: '全部' },
            ],
        },
    ],
    actions: (data) => {
        const actions = [{
            path: path.resolve(process.cwd(), './src/logics/index.ts'),
            template: [
              '/**',
              ' * @NaslLogic',
              ' * @title {{title}}',
              ' * @desc {{title}}',
              ' * @param str 参数描述',
              ' * @returns 返回结果描述',
              ' */',
              'export function {{name}}(str: nasl.core.String) {',
              '}',
              '\n',
            ].join('\n'),
            unique: false,
            type: 'append',
        }];

        return actions;
    },
};
