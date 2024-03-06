const { build } = require('vite');
const defineViteConfig = require('../config/vite.config');

defineViteConfig({ command: 'build', mode: 'production' }).then(async (config) => {
  config.build.lib.formats = ['umd'];
  config.build.minify = true;
  config.build.emptyOutDir = true;
  await build({
    configFile: false,
    ...config,
  });

  config.build.lib.formats = ['es', 'cjs'];
  config.build.minify = false;
  config.build.emptyOutDir = false;
  await build({
    configFile: false,
    ...config,
  });
});
