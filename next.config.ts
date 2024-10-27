import type { NextConfig } from 'next';
import withMDX from '@next/mdx';
import remarkGFM from 'remark-gfm';

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: false,
  pageExtensions: ['mdx', 'tsx'],
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  webpack(config) {
    // Ensures that web workers can import scripts.
    config.output.publicPath = "/_next/";
    // https://github.com/wojtekmaj/react-pdf
    config.resolve.alias.canvas = false;
    // From https://github.com/rustwasm/wasm-pack/issues/835#issuecomment-772591665
    config.experiments = {
      ...config.experiments,
      syncWebAssembly: true
    };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/sync",
    });
    config.module.rules.push({
      test: /\.glsl/,
      type: "asset/source",
    });
    return config;
  },
};
const final =  withMDX({
  options: {
    remarkPlugins: [remarkGFM]
  }
})(nextConfig);
export default final
