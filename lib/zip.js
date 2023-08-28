const glob = require('glob');
const root = process.cwd();
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
path.resolve(root, 'vusion.config.js');

const zipDir = (basePath, fileName = 'client.zip', files) => new Promise((res) => {
    const zipPath = path.resolve(basePath, fileName);
    const output = fs.createWriteStream(zipPath);// 将压缩包保存到当前项目的目录下，并且压缩包名为test.zip
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);

    for (let i = 0; i < files.length; i++) {
        // 将被打包文件的流添加进archiver对象中
        archive.append(fs.createReadStream(files[i]), { name: files[i] });
    }
    archive.finalize();
    archive.on('end', () => {
        res(zipPath);
    });
});

const callZip = async () => {
    const dirList = ['usage.json', 'manifest'];
    const fileList = glob.sync(`dist-theme/**.**`, { root });
    const zipList = dirList.concat(fileList);
    const pkg = require(path.resolve(root, 'package.json'));
    const manifestData = {
        'Plugin-Version': '1.0.0',
        'Library-Type': 'Frontend',
        'Metadata-File': 'usage.json',
    };

    fileList.forEach((filePath) => {
        manifestData[getPath(filePath, pkg)] = filePath;
    });
    let manifestStr = '';
    for (const i in manifestData) {
        if (manifestStr) {
            manifestStr += '\n';
        }
        manifestStr += `${i}: ${manifestData[i]}`;
    }
    fs.writeFileSync(path.resolve(root, 'manifest'), manifestStr);
    await zipDir(root, pkg.name + '.zip', zipList);
    console.log('zip success');
};

function getPath(filePath, pkg) {
    const resultPath = `packages/extension/${pkg.name}@${pkg.version}/${filePath}`;
    // const resultPath = `packages/${pkg.name}@${pkg.version}/${filePath}`;
    return resultPath;
}

module.exports = callZip;
