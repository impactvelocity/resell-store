/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The proxy buffers request bodies; listing videos can be up to 40 MB
    proxyClientMaxBodySize: "45mb",
  },
};

export default nextConfig;
