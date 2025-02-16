import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: false,
  // Error on array of length 1, doesn't process MDX
  pageExtensions: ['tsx', 'mdx'],
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
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });
    return config;
  },
};
export default nextConfig
