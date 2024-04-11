const fs = require('fs-extra');
const path = require('path');

function copyFolder(sourceFolder, destinationFolder, info) {
  if (!fs.existsSync(sourceFolder)) {
    return;
  }

  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder, { recursive: true });
  }

  fs.readdirSync(sourceFolder).forEach((file) => {
      const sourceFilePath = `${sourceFolder}/${file}`;

      if (file.startsWith('_')) {
        file = '.' + file.substring(1);
      }

      const destinationFilePath = `${destinationFolder}/${file}`;
      if (fs.lstatSync(sourceFilePath).isDirectory()) {
          copyFolder(sourceFilePath, destinationFilePath, info);
      } else {
          const buffer = fs.readFileSync(sourceFilePath, 'utf8');
          fs.writeFileSync(destinationFilePath, buffer.toString().replace(/\{\{LIBRARY_NAME\}\}/g, info.name));
      }
  });
}

module.exports = async ({ templatePath, basePath, info }) => {
  copyFolder(templatePath, basePath, info);

  const pkg = require(path.resolve(basePath, 'package.json'));
  pkg.name = info.name;
  pkg.title = info.title;
  pkg.description = info.title;
  await fs.outputFile(path.resolve(basePath, 'package.json'), JSON.stringify(pkg, null, 2));
};
