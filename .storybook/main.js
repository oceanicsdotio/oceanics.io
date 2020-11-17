module.exports = {
    stories: ['../src/components/**/*.stories.jsx'],
    addons: [
        "@storybook/addon-links",
        "@storybook/addon-essentials",
        "@storybook/addon-actions",
        "@storybook/addon-docs"
    ],
    webpackFinal: async config => {
        // Transpile Gatsby ES6 code.
        config.module.rules[0].exclude = [/node_modules\/(?!(gatsby)\/)/]
        // use installed babel-loader which is v8.0-beta (which is meant to work with @babel/core@7)
        config.module.rules[0].use[0].loader = require.resolve("babel-loader")
        // use @babel/preset-react for JSX and env (instead of staged presets)
        config.module.rules[0].use[0].options.presets = [
            require.resolve("@babel/preset-react"),
            require.resolve("@babel/preset-env"),
        ]
        
        config.module.rules[0].use[0].options.plugins = [
            // use @babel/plugin-proposal-class-properties for class arrow functions
            require.resolve("@babel/plugin-proposal-class-properties"),
            // use babel-plugin-remove-graphql-queries to remove static queries from components when rendering in storybook
            require.resolve("babel-plugin-remove-graphql-queries"),
        ]

        config.resolve.mainFields = ["browser", "module", "main"];
        return config;
    },
}