// https://nextjs.org/docs/basic-features/typescript#type-checking-nextconfigjs
/**
 * @type {import('next').NextConfig}
 **/
import withMDX from '@next/mdx'

const nextConfig = {
  output: "export",
  distDir: "build",
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  trailingSlash: true,
  compiler: {
    // https://nextjs.org/docs/advanced-features/compiler#styled-components
    styledComponents: true,
  },
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
const final =  withMDX()(nextConfig);
export default final