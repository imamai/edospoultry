/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: [
      "gxgcrpemrmqrfoxrbsdf.supabase.co",
      "api.mapbox.com",
      "lh3.googleusercontent.com",
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["xml2js", "crypto-js"],
  },
  async headers() {
    return [
      {
        source: "/api/ussd/webhook",
        headers: [{ key: "Content-Type", value: "text/plain" }],
      },
    ];
  },
};

module.exports = nextConfig;
