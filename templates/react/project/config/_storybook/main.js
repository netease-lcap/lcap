const { mergeConfig } = require('vite');
const defineViteConfig = require('../vite.config');
const pwd = process.cwd();
const config = {
  stories: [
    `${pwd}/src/**/stories/**/*.mdx`,
    `${pwd}/src/**/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)`,
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
  },
  docs: {
    autodocs: "tag",
  },
  async viteFinal(config, { configType }) {
    const viteConfig = await defineViteConfig({ command: 'build', mode: configType })
    return mergeConfig(config);
  }
};
module.exports = config;
