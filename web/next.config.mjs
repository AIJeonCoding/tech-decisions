/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  transpilePackages: ['@td/db'],
  // Bundle the seeded SQLite file into Vercel function output so runtime can read it.
  // Include both monorepo-root and web/ copies for resilience across cwd setups.
  outputFileTracingIncludes: {
    '/**': ['../tech-decisions.db', './tech-decisions.db'],
  },
  // Native modules — exclude from server bundle so Node can resolve them via real require.resolve.
  // sqlite-vec loads its platform-specific .dylib via dynamic require, which webpack stubs.
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec'],
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
