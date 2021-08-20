const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const configurator = require('./config.js');

const MATERIAL_SOURCES = {
    component: 'lcap-component',
};

/**
 * 使用 spawn 的 shell inherit 模式，直接对接主进程的 stdio
 * @param {Array} args 命令参数，每一项可以为字符串或是字符串数组
 * await exec('rm', '-rf', 'node_modules')
 * await exec('git clone', 'xxx')
 * @return {Promise} Promise
 */
function exec(command, options = {}) {
    return new Promise((resolve, reject) => {
        const result = spawn(command, Object.assign({
            shell: true,
            stdio: 'inherit',
        }, options));
        result.on('error', reject);
        result.on('close', (code) => (code === 0 ? resolve() : reject()));
    });
}

const downloadFromNPMCli = async function (material, dest, clearExisting) {
    const registry = configurator.getDownloadRegistry();
    let packageName = MATERIAL_SOURCES[material];
    let version = 'latest';
    if (material.includes('#')) {
        packageName = material.split('#')[0];
        version = material.split('#')[1] || version;
    }

    const name = packageName.replace(/\//, '__');
    if (fs.existsSync(dest)) {
        if (clearExisting)
            fs.removeSync(dest);
        else
            return dest;
    }

    const temp = path.resolve(os.tmpdir(), name + '-' + new Date().toJSON().replace(/[-:TZ]/g, '').slice(0, -4));
    await fs.ensureDir(temp);

    await fs.writeFile(path.join(temp, 'package.json'), '{}', 'utf8');
    await exec(`npm --ignore-scripts --registry "${registry}" install ${name}@${version}`, { cwd: temp });
    await fs.move(path.join(temp, 'node_modules', name), dest);
    await fs.removeSync(temp);

    return dest;
};

module.exports = downloadFromNPMCli;
