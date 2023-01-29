module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials", "@storybook/addon-actions", "@storybook/addon-docs"],
  features: {
    storyStoreV7: true
  },
  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: prop => prop.parent ? !/node_modules/.test(prop.parent.fileName) : true
    }
  },
  core: {
    builder: "webpack5",
    disableTelemetry: true
  },
  // https://stackoverflow.com/questions/71158775/storybook-couldnt-resolve-fs
  webpackFinal: async (config) => {
    config.resolve = {
        ...config.resolve,
        fallback: {
            ...(config.resolve || {}).fallback,
            fs: false,
            stream: false,
            os: false,
        },
    }

    // Return the altered config
    return config
},
};