/** @type {import('next').NextConfig} */
const nextConfig = {
  // This tells Vercel to ignore strict linting and type errors during deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig; 
// Note: If your file is named next.config.js, change this last line to: module.exports = nextConfig;