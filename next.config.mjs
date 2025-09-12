/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    unoptimized: true, // Cloudflare Pages friendly
  },
};

export default nextConfig;
