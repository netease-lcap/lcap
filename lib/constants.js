const LCAP_MODULES = ".lcap";
const LCAP_UI = "lcap-ui";
const DIST_FOLDER = "runtime";
const MAINIFEST_FILE_NAME = "manifest.json";
const LCAP_MODULE_FILE_NAME = "lcap-module.json";
const PACKAGE_FILE_NAME = "zip.tgz";
const LCAP_UI_CONFIG_FILE_NAME = 'nasl.ui.json';
const UI_PREFIX = "packages";

const DEFAULT_MANIFEST = {
  nasl: ["dist-theme/nasl.ui.json", "dist-theme/nasl.ui.d.ts"],
  runtime: ["dist-theme/index.js", "dist-theme/index.css"],
  theme: [],
  package: ["zip.tgz"],
  i18n: [],
  ide: [],
};

module.exports = {
  UI_PREFIX,
  LCAP_MODULES,
  LCAP_UI,
  DIST_FOLDER,
  MAINIFEST_FILE_NAME,
  DEFAULT_MANIFEST,
  PACKAGE_FILE_NAME,
  LCAP_MODULE_FILE_NAME,
  LCAP_UI_CONFIG_FILE_NAME,
};
