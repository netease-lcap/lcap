const fs = require("fs-extra");
const globby = require("globby");

function listFiles(dir, filters = {}, recursive = false) {
  dir = dir.replace(/\\/g, "/");
  const pattern = recursive ? "**" : "*";
  // globby 只支持 /
  return globby
    .sync(
      [dir ? dir + "/" + pattern : pattern].concat(filters.patterns || []),
      {
        dot: filters.dot,
        onlyFiles: false,
      },
    )
    .filter((filePath) => {
      if (filters.type) {
        const stat = fs.statSync(filePath);
        if (filters.type === "file" && !stat.isFile()) return false;
        if (filters.type === "directory" && !stat.isDirectory()) return false;
        if (filters.type === "link" && !stat.isSymbolicLink()) return false;
      }
      if (filters.includes) {
        if (!Array.isArray(filters.includes))
          filters.includes = [filters.includes];
        if (
          !filters.includes.every((include) => {
            if (typeof include === "string") return filePath.includes(include);
            else return include.test(filePath);
          })
        )
          return false;
      }
      if (filters.excludes) {
        if (!Array.isArray(filters.excludes))
          filters.excludes = [filters.excludes];
        if (
          filters.excludes.some((exclude) => {
            if (typeof exclude === "string") return filePath.includes(exclude);
            else return exclude.test(filePath);
          })
        )
          return false;
      }
      if (filters.filters) {
        if (!Array.isArray(filters.filters))
          filters.filters = [filters.filters];
        if (!filters.filters.every((filter) => filter(filePath))) return false;
      }
      return true;
    });
}

function listAllFiles(dir, filters = {}) {
  return listFiles(dir, filters, true);
}

function copyFolder(sourceFolder, destinationFolder) {
  if (!fs.existsSync(sourceFolder)) return;
  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder, { recursive: true });
  }
  fs.readdirSync(sourceFolder).forEach((file) => {
    const sourceFilePath = `${sourceFolder}/${file}`;
    const destinationFilePath = `${destinationFolder}/${file}`;
    if (fs.lstatSync(sourceFilePath).isDirectory()) {
      copyFolder(sourceFilePath, destinationFilePath);
    } else {
      fs.copyFileSync(sourceFilePath, destinationFilePath);
    }
  });
}

module.exports = {
  listAllFiles,
  copyFolder,
};
