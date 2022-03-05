module.exports = {
  // https://nextjs.org/docs/advanced-features/compiler
  compiler: {
    // ssr and displayName are configured by default
    styledComponents: true,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
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

    return config;
  },
};
