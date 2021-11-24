const path = require("path");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

module.exports = {
    images: {
        disableStaticImages: true,
    },
    reactStrictMode: false,
  webpack(config) {
    // Ensures that web workers can import scripts.
    config.output.publicPath = "/_next/";

    // From https://github.com/rustwasm/wasm-pack/issues/835#issuecomment-772591665
    config.experiments = {
      syncWebAssembly: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/sync",
    });

    // From https://github.com/wasm-tool/wasm-pack-plugin
    config.plugins.push(
      new WasmPackPlugin({
        crateDirectory: resolve("./rust"),
        args: "--log-level warn",
      })
    );

    // From https://github.com/vercel/next.js/issues/22581#issuecomment-864476385
    const ssrPlugin = config.plugins.find(
      (plugin) => plugin instanceof SSRPlugin
    );

    if (ssrPlugin) {
      patchSsrPlugin(ssrPlugin);
    }

    return config;
  },
};

module.exports = {
  images: {
    disableStaticImages: true,
  },
  reactStrictMode: false,
  webpack: {
    plugins: [
      new WasmPackPlugin({
        crateDirectory: path.resolve(__dirname, "crate"),

        // Check https://rustwasm.github.io/wasm-pack/book/commands/build.html for
        // the available set of arguments.
        //
        // Optional space delimited arguments to appear before the wasm-pack
        // command. Default arguments are `--verbose`.
        args: "--log-level warn",
        // Default arguments are `--typescript --target browser --mode normal`.
        extraArgs: "--no-typescript",

        // Optional array of absolute paths to directories, changes to which
        // will trigger the build.
        // watchDirectories: [
        //   path.resolve(__dirname, "another-crate/src")
        // ],

        // The same as the `--out-dir` option for `wasm-pack`
        // outDir: "pkg",

        // The same as the `--out-name` option for `wasm-pack`
        // outName: "index",

        // If defined, `forceWatch` will force activate/deactivate watch mode for
        // `.rs` files.
        //
        // The default (not set) aligns watch mode for `.rs` files to Webpack's
        // watch mode.
        // forceWatch: true,

        // If defined, `forceMode` will force the compilation mode for `wasm-pack`
        //
        // Possible values are `development` and `production`.
        //
        // the mode `development` makes `wasm-pack` build in `debug` mode.
        // the mode `production` makes `wasm-pack` build in `release` mode.
        // forceMode: "development",

        // Controls plugin output verbosity, either 'info' or 'error'.
        // Defaults to 'info'.
        // pluginLogLevel: 'info'
      }),
    ],
  },
};
