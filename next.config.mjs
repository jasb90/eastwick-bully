/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',            // build to static files in /out
  images: { unoptimized: true },
  trailingSlash: false,        // keep clean URLs
  // IMPORTANT: Do NOT set basePath or assetPrefix
};

export default nextConfig;
