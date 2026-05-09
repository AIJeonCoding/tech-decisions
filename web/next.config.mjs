/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  transpilePackages: ['@td/db'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'static.toss.im' },
      { protocol: 'https', hostname: 'tech.kakao.com' },
      { protocol: 'https', hostname: 'cdn-images-1.medium.com' },
    ],
  },
  webpack(config) {
    // Allow ESM-style ".js" extensions to resolve to ".ts" sources in workspace packages.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
