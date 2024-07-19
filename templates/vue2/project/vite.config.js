import { defineConfig } from 'vite';
import path from 'path';
import { createVuePlugin as vue2 } from '@lcap/vite-plugin-vue2';
import { lcapPlugin } from '@lcap/builder';

// 设置测试运行的时区
process.env.TZ = 'Asia/Shanghai';
const kb2Camcel = (name) => name.replace(/(?:^|-)([a-zA-Z0-9])/g, (m, $1) => $1.toUpperCase());

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const pkgInfo = require(`${process.cwd()}/package.json`);
  return {
    plugins: [
      vue2({
        jsx: true,
        jsxOptions: {
          vModel: true,
          functional: false,
          injectH: true,
          vOn: true,
          compositionAPI: false,
        },
      }),
      lcapPlugin({
        type: 'extension',
        framework: 'vue2',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'virtual-lcap:lcap-ui': path.resolve(__dirname, './.lcap/lcap-ui/runtime/index.js'),
        'virtual-lcap:lcap-ui.css': path.resolve(__dirname, './.lcap/lcap-ui/runtime/index.css'),
      },
    },
    define: {
      'process.env': {
        VUE_APP_DESIGNER: false,
        NODE_ENV: command === 'build' ? 'production' : 'development',
      },
    },
    optimizeDeps: {
      include: ['virtual-lcap:lcap-ui'],
    },
    build: {
      cssCodeSplit: false,
      target: ['es2020', 'edge88', 'firefox78', 'chrome56', 'safari14'],
      lib: {
        entry: 'src/index',
        name: kb2Camcel(pkgInfo.name),
      },
      sourcemap: true,
    },
    test: {
      environment: 'jsdom',
    },
  };
});
