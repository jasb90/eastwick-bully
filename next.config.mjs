/** @type {import('next').NextConfig} */
const isProd = process.env.GITHUB_ACTIONS === 'true';
const basePath = isProd ? '/eastwick-bully' : '';

export default {
  output: 'export',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};


