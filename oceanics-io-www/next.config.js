// @ts-check

// https://www.npmjs.com/package/@next/bundle-analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE_BUNDLE === 'true',
  openAnalyzer: false,
})

// https://nextjs.org/docs/basic-features/typescript#type-checking-nextconfigjs
/**
 * @type {import('next').NextConfig}
 **/
const config = {
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

module.exports = withBundleAnalyzer(config)