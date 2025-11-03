/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export a static site for GitHub Pages
  output: 'export',

  // No basePath or assetPrefix when using a custom domain at the root
  // basePath: undefined,
  // assetPrefix: undefined,

  // Optional but avoids image optimization on Pages
  images: { unoptimized: true },

  // Optional (nice for Pages so folders become .../index.html)
  trailingSlash: true,
};

export default nextConfig;

