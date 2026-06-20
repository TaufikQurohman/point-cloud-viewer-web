/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PDAL/PotreeConverter output and large point cloud files are served
  // statically from /storage via a custom route handler, not Next's
  // built-in static file serving, so no special webpack config is needed.
  experimental: {
    serverComponentsExternalPackages: []
  },
  // API routes that proxy large file uploads need a higher body size limit.
  // For the App Router this is configured per-route via `export const config`
  // is not used (that's the Pages Router API). Instead we read the stream
  // manually in the route handler (see src/app/api/v1/upload/route.ts).
  webpack: (config) => {
    return config;
  }
};

module.exports = nextConfig;
