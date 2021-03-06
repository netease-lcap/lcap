const spawn = require('cross-spawn');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const configurator = require('../lib/config');

function isNotFoundError(error = '') {
    return error.indexOf('Cannot find module') === 0;
}

/**
 * get Puppeteer(headless chromium)
 *
 * we don't want depend on puppeteer locally,
 * puppeteer takes a long to install
 *
 */
module.exports = function getPuppeteer() {
    try {
    // get Puppeteer from local node_modules
    // eslint-disable-next-line global-require
        return require('puppeteer');
    } catch (error) {
        if (isNotFoundError(error.message)) {
            try {
                // get Puppeteer from global node_modules
                // Fix problem on node 12
                const globalDirs = require('global-dirs');
                if (!fs.existsSync(path.join(globalDirs.yarn.packages, 'puppeteer'))
                    && !fs.existsSync(path.join(globalDirs.npm.packages, 'puppeteer')))
                    throw new Error('Cannot find module puppeteer');

                // eslint-disable-next-line global-require
                return require('import-global')('puppeteer');
            } catch (importGlobalErr) {
                const registry = configurator.getDownloadRegistry();

                // if not found puppeteer from global node_modules
                // install it to global node_modules
                if (isNotFoundError(importGlobalErr.message)) {
                    console.error(chalk.yellow('\n\nCannot find puppeteer in current environment.'));
                    console.error(chalk.yellow('Installing globally puppeteer, please wait a moment.\n'));

                    // set puppeteer download host
                    // default download host has been blocking, use cnpm mirror
                    // https://github.com/cnpm/cnpmjs.org/issues/1246#issuecomment-341631992
                    spawn.sync('npm', ['config', 'set', 'puppeteer_download_host=https://storage.googleapis.com.cnpmjs.org']);
                    const result = spawn.sync('npm', ['install', 'puppeteer@1.x', '-g', '--registry', registry], { stdio: 'inherit' });
                    spawn.sync('npm', ['config', 'delete', 'puppeteer_download_host']);

                    // get spawn error, exit with code 1
                    if (result.status || result.error) {
                        if (String(result.stderr).includes('end of central directory record signature not found')) {
                            console.error(chalk.red('\n\nInstall Error. \nPlease install puppeteer using the following commands:'));
                            console.error(chalk.white('\n  npm install -g puppeteer --unsafe-perm=true --allow-root'));
                            console.error(chalk.white(''));
                        } else {
                            console.error(chalk.red('\n\nInstall Error. \nPlease install puppeteer using the following commands:'));
                            console.error(chalk.white('\n  npm uninstall puppeteer -g'));
                            console.error(chalk.white(`\n  PUPPETEER_DOWNLOAD_HOST=https://storage.googleapis.com.cnpmjs.org npm i puppeteer -g --registry=${registry}`));
                            console.error(chalk.white(''));
                        }
                        process.exit(1);
                    }

                    console.info(chalk.green('\nPuppeteer installed.\n'));

                    // eslint-disable-next-line global-require
                    return require('import-global')('puppeteer');
                }
                throw Error(importGlobalErr);
            }
        }
        throw Error(error);
    }
};
