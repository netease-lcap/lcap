const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const glob = require('glob');
const utils = require('./utils');
const configurator = require('./config.js');
const downloadFromNPMCli = require('./npmCli');

const MATERIAL_SOURCES = {
    component: 'lcap-component',
};

const FORMAT_NAME_TYPES = ['block', 'component'];

const FORMAT_TYPES = FORMAT_NAME_TYPES.concat(['repository']);

const downloadFromNPM = async function (material, dest, isUser) {
    // 暂时不暴露
    const vusion = require('vusion-api');
    const registry = configurator.getDownloadRegistry();
    let packageName = MATERIAL_SOURCES[material];
    let version = 'latest';
    if (material.includes('#')) {
        packageName = material.split('#')[0];
        version = material.split('#')[1] || version;
    }

    // 会根据版本缓存 package
    const cacheDir = vusion.ms.getCacheDir('templates');
    const tempPath = await vusion.ms.download.npm({
        registry,
        name: packageName,
        version,
    }, cacheDir);

    const packageJSONPath = path.resolve(tempPath, 'package.json');
    if (fs.existsSync(packageJSONPath)) {
        const pkg = JSON.parse(await fs.readFile(packageJSONPath, 'utf8'));
        const vusion = pkg.vusion = pkg.vusion || {};
        const ignore = !isUser ? [] : vusion.ignore; // 贡献者使用，默认是二次开发，所以全量复制；用户使用，不希望无关文件干扰
        if (ignore && Array.isArray(ignore)) {
            await new Promise((res, rej) => {
                glob('**', {
                    ignore,
                    cwd: tempPath,
                    dot: true,
                }, (err, files) => {
                    if (err) {
                        rej(err);
                    } else {
                        files.forEach((file) => {
                            const source = path.join(tempPath, file);
                            const target = path.join(dest, file);
                            if (utils.isDir(source)) {
                                return;
                            }
                            fs.copySync(source, target);
                        });
                        res();
                    }
                });
            }).catch((e) => {
                console.error(e);
                process.exit(1);
            });
        } else {
            await fs.copy(tempPath, dest);
        }
    } else {
        await fs.copy(tempPath, dest);
    }
};

const renameUnderscore = async function (dest, filename) {
    const _filepath = path.resolve(dest, filename);
    const filepath = path.resolve(dest, filename.slice(1));
    if (fs.existsSync(_filepath))
        await fs.move(_filepath, filepath, { overwrite: true });
    return filepath;
};

const formatTemplatePackage = async function (dest, answers, name, isUser, isCacheMode) {
    const packageJSONPath = await renameUnderscore(dest, '_package.json');
    await renameUnderscore(dest, '_.gitignore'); // https://github.com/npm/npm/issues/3763
    await renameUnderscore(dest, '_.npmignore');
    await renameUnderscore(dest, '_package-lock.json');

    if (fs.existsSync(packageJSONPath)) {
        const pkg = JSON.parse(await fs.readFile(packageJSONPath, 'utf8'));
        pkg.vusion = pkg.vusion || {};
        pkg.vusion.title = answers.title || pkg.vusion.title;
        pkg.vusion.category = answers.category || pkg.vusion.category;
        pkg.vusion.team = answers.team || pkg.vusion.team;
        pkg.vusion.access = answers.access || pkg.vusion.access;
        if (!isCacheMode) {
            pkg.template = pkg.template || {};
            pkg.template.inited = true;
        }
        pkg.name = name;
        if (isUser) {
            delete pkg.vusion;
        }
        await fs.outputFile(packageJSONPath, JSON.stringify(pkg, null, 2));
    }
};

module.exports = async function init(options = {}, args = {}) {
    // 暂时不暴露
    const vusion = require('vusion-api');
    const cli = vusion.cli;
    options.inVusionProject = false;
    if (utils.isVusionProject(process.cwd())) {
        options.inVusionProject = true;
        options.path = path.join(`src/${options.type}s`, options.path);
    } else if (utils.isInVusionProject(process.cwd())) {
        options.inVusionProject = true;
    }

    if (FORMAT_NAME_TYPES.includes(options.type)) {
        options.tagName = options.name.replace(/^.+\//, '').replace(/\.vue$/, '');
        options.componentName = vusion.utils.kebab2Camel(options.tagName);
    }

    const dest = utils.getDest(options.path);

    let spinner;
    try {
        let answers = {};
        answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'title',
                message: 'Please input a title (中文名)',
            },
            {
                type: 'list',
                name: 'category',
                message: 'Select a category',
                choices: [
                    {
                        value: 'Runtime',
                        name: '运行时',
                    },
                    {
                        value: 'Container',
                        name: '容器',
                    },
                    {
                        value: 'Layout',
                        name: '布局',
                    },
                    {
                        value: 'InfoDisplay',
                        name: '信息展示',
                    },
                    {
                        value: 'DataDisplay',
                        name: '数据展示',
                    },
                    {
                        value: 'Table',
                        name: '表格',
                    },
                    {
                        value: 'Media',
                        name: '多媒体',
                    },
                    {
                        value: 'Form',
                        name: '表单',
                    },
                    {
                        value: 'Selector',
                        name: '选择器',
                    },
                    {
                        value: 'Chart',
                        name: '图表',
                    },
                    {
                        value: 'Feedback',
                        name: '反馈',
                    },
                    {
                        value: 'Effects',
                        name: '特效',
                    },
                    {
                        value: 'Editor',
                        name: '编辑器',
                    },
                    {
                        value: 'Other',
                        name: '其他',
                    },
                ],
            },
        ]);
        answers.access = 'public';
        if (!args.notDownload) {
            // 需要等回答完问题后再删除原文件
            if (!utils.isEmpty(dest)) {
                if (args.force)
                    await utils.removeWithoutNodeModules(dest);
                else {
                    const { overwrite } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'overwrite',
                            message: 'The directory is not empty. Are you sure to continue?',
                            default: false,
                        },
                    ]);

                    if (overwrite)
                        await utils.removeWithoutNodeModules(dest);
                    else
                        return;
                }
            }
        }

        if (configurator.get('npm_cli')) {
            await downloadFromNPMCli(options.material, dest, args.isUser);
        } else {
            await downloadFromNPM(options.material, dest, args.isUser);
        }

        {
            spinner = ora(`Initializing the material...`).start();
            if (FORMAT_TYPES.includes(options.type)) // 模板都不转换
                await vusion.ms.formatTemplate(dest, Object.assign(options, answers));

            await formatTemplatePackage(dest, answers, options.name, args.isUser);
            spinner.succeed();
        }

        console.info();
        cli.done(`Successfully initialized ${options.type} ${chalk.cyan(options.name)}.`);

        console.info(`\n👉 Get started with the following commands:\n`);
        console.info(chalk.gray(' $ ') + chalk.cyan('cd ' + options.path));
        !options.inVusionProject && console.info(chalk.gray(' $ ') + chalk.cyan(configurator.getInstallCommand()));
        if (options.type === 'repository') {
            console.info(chalk.gray(' $ ') + chalk.cyan('lcap init block'));
            console.info(chalk.gray(' $ ') + chalk.cyan('lcap init component'));
        } else
            console.info(chalk.gray(' $ ') + chalk.cyan('npm run dev'));
    } catch (error) {
        spinner && spinner.fail();
        error && cli.error(error);
        process.exit(1);
    }
};
