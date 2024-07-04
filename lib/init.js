const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const configurator = require('./config.js');
const genProject = require('./genProject.js');


module.exports = async function init(options = {}, args = {}) {
    let answers = {};
    answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'title',
            message: 'Please input a title (中文名)',
        },
        {
            type: 'list',
            name: 'framework',
            message: 'Please select framework template',
            choices: [
                { name: 'vue2 (IDE版本 >= 3.8)', value: 'vue2' },
                { name: 'react (IDE版本 >= 3.8)', value: 'react' },
                { name: 'vue2', value: 'old' },
            ],
        },
    ]);
    answers.access = 'public';
    answers.category = 'Runtime';
    const spinner = ora(`Initializing the material...`).start();
    const basePath = path.resolve(process.cwd(), options.name);
    if (answers.framework === 'react') {
        await genProject({
            templatePath: path.resolve(__dirname, '../templates/react/project'),
            basePath,
            info: { name: options.name, title: answers.title },
        });
    } else if (answers.framework === 'vue2') {
        await genProject({
            templatePath: path.resolve(__dirname, '../templates/vue2/project'),
            basePath,
            info: { name: options.name, title: answers.title },
        });
    } else {
        fs.copySync(path.resolve(__dirname, '../plop-templates/project'), basePath);
        const pkg = require(path.resolve(basePath, 'package.json'));
        pkg.name = options.name;
        pkg.title = answers.title;
        pkg.version = '1.0.0';
        await fs.outputFile(path.resolve(basePath, 'package.json'), JSON.stringify(pkg, null, 2));
    }
    spinner.succeed();
    console.info(`\n👉 Get started with the following commands:\n`);
    console.info(chalk.gray(' $ ') + chalk.cyan('cd ' + options.path));
    console.info(chalk.gray(' $ ') + chalk.cyan(configurator.getInstallCommand()));
    console.info(chalk.gray(' $ ') + chalk.cyan('lcap create'));
    console.info(chalk.gray(' $ ') + chalk.cyan('npm run dev'));
};
