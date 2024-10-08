const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const { lcapPlugin } = require('@lcap/builder');
const path = require('path');

module.exports = defineConfig((configEnv) => {
  const pkgInfo = require(`${process.cwd()}/package.json`);
  const defaultConfig = {
    plugins: [
      react({ jsxRuntime: 'classic' }),
      lcapPlugin({
        type: 'extension',
      }),
    ],
    build: {
      lib: {
        entry: 'src/index.ts',
        name: pkgInfo.name,
        formats: ['es', 'cjs', 'umd'],
      },
      outDir: 'dist-theme',
      sourcemap: true,
    },
    define: {
      'process.env': {
        NODE_ENV: configEnv.mode === 'development' ? 'development' : 'production',
        VUE_APP_DESIGNER: false,
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@lcap-ui': path.resolve(__dirname, './.lcap/lcap-ui/package'),
      },
    },
    test: {
      environment: 'jsdom',
    },
  };

  return defaultConfig;
});
