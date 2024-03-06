const { defineConfig, mergeConfig, loadConfigFromFile } = require('vite');
const autoprefixer = require('autoprefixer');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig(async (configEnv) => {
  const pkgInfo = require(`${process.cwd()}/package.json`);
  const loadingResult = await loadConfigFromFile(configEnv, '', process.cwd());
  const defaultConfig = {
    plugins: [react()],
    build: {
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      lib: {
        entry: 'src/index.ts',
        name: pkgInfo.name,
        fileName: (format, entryName) => {
          switch (format) {
            case 'es':
              return `${entryName}.mjs`;
            case 'cjs':
              return `${entryName}.cjs`;
            default:
              return `${entryName}.js`;
          }
        },
      },
      outDir: 'dist-theme',
      sourcemap: false,
      cssMinify: true,
      rollupOptions: {
        external: ['react', 'react-dom'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') {
              return 'index.css';
            }

            return '[name][extname]';
          },
        },
      },
    },
    define: {
      'process.env': {
        NODE_ENV: configEnv.mode === 'development' ? 'development' : 'production',
        VUE_APP_DESIGNER: false,
      },
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({
            overrideBrowserslist: [
              '> 1%',
              'last 2 versions',
              'ie >= 9',
            ],
            grid: true,
          }),
        ],
      },
    },
    esbuild: false,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../src'),
        '@components': path.resolve(__dirname, '../src/components'),
      },
    },
    test: {
      environment: 'jsdom',
    },
  };

  if (!loadingResult) {
    return defaultConfig;
  }

  return mergeConfig(defaultConfig);
});
