const path = require('path');
const fs = require('fs-extra');
const shell = require('shelljs');
const glob = require('glob');
const pwd = process.cwd();

const utils = {
    getFileName(name) {
        return name.includes('/') ? name.split('/')[1] : name;
    },
    getDest(dir) {
        return path.resolve(pwd, dir);
    },
    async removeWithoutNodeModules(dir) {
        await new Promise((res, rej) => {
            glob('**', {
                ignore: ['node_modules/**'],
                cwd: dir,
                dot: true,
            }, (err, files) => {
                if (err) {
                    rej(err);
                } else {
                    files.forEach((file) => {
                        fs.removeSync(path.join(dir, file));
                    });
                    res();
                }
            });
        });
    },
    isDir(file) {
        return fs.statSync(file).isDirectory();
    },
    isEmpty(dir) {
        if (fs.existsSync(dir)) {
            return !shell.ls('-lA', dir).length;
        }
        return true;
    },
    isVusionProject(dir) {
        const pkgPath = path.join(dir, 'package.json');
        if (!fs.existsSync(pkgPath)) {
            return false;
        }
        const vusion = require(pkgPath).vusion || {};
        return vusion.type === 'repository';
    },
    isInVusionProject(dir) {
        const pkgPath = path.join(dir, '../../package.json');
        if (!fs.existsSync(pkgPath)) {
            return false;
        }
        const vusion = require(pkgPath).vusion || {};
        return vusion.type === 'repository';
    },
};
module.exports = utils;
