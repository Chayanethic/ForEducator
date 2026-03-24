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