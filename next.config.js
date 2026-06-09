/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
