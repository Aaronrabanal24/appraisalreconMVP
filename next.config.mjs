/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    unoptimized: true, // Cloudflare Pages friendly
  },
  
  async redirects() {
    return [
      { source: "/i",    destination: "/intake",   permanent: false },
      { source: "/s",    destination: "/intake",   permanent: false },
      { source: "/c",    destination: "/capture",  permanent: false },
      { source: "/cap",  destination: "/capture",  permanent: false },
      { source: "/a",    destination: "/appraisal",permanent: false },
      { source: "/calc", destination: "/appraisal",permanent: false },
      { source: "/h",    destination: "/",         permanent: false },
      { source: "/a", destination: "/appraisal", permanent: false },
    ];
  },
};

export default nextConfig;
