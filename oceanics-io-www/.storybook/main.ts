import { dirname, join } from "path";
import type { StorybookConfig } from '@storybook/nextjs';

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, "package.json")));
}

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.mdx", 
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  addons: [
    getAbsolutePath("@storybook/addon-links"), 
    getAbsolutePath("@storybook/addon-essentials"), 
    getAbsolutePath("@storybook/addon-actions"), 
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-interactions")
  ],
  features: {
    storyStoreV7: true
  },
  framework: "@storybook/nextjs",
  staticDirs: ['../public'],
  docs: {
    autodocs: true
  },
  core: {
    disableTelemetry: true
  },
  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: prop => 
        (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true)
    }
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
        
    };
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    }
    config.module = {
      ...config.module,
      rules: [...config.module?.rules||[], {
        test: /\.glsl/,
        type: "asset/source",
      }]
    };
  
    return config
  },
};

export default config