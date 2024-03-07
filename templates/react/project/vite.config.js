const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig(async (configEnv) => {
  const pkgInfo = require(`${process.cwd()}/package.json`);
  const defaultConfig = {
    plugins: [react()],
    build: {
      target: ['es2020', 'edge88', 'firefox78', 'chrome56', 'safari14'],
      lib: {
        entry: 'src/index.ts',
        name: pkgInfo.name,
        formats: ['es', 'cjs', 'umd'],
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
      minify: false,
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

  return defaultConfig;
});
