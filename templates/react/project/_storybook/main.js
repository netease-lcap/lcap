const pwd = process.cwd();
const config = {
  stories: [
    `${pwd}/src/**/*.mdx`,
    `${pwd}/src/**/*.stories.@(js|jsx|mjs|ts|tsx)`,
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        viteConfigPath: './vite.config.js',
      },
    },
  },
  docs: {
    autodocs: "tag",
  }
};

module.exports = config;
