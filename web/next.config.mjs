/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  transpilePackages: ['@td/db'],
  // Bundle the seeded SQLite file into Vercel function output so runtime can read it.
  outputFileTracingIncludes: {
    '/**': ['../tech-decisions.db'],
  },
  // better-sqlite3 is a native module — exclude from server bundle so Next can still resolve it.
  serverExternalPackages: ['better-sqlite3'],
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
