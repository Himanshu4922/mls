import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo sits inside a parent folder that has its own package-lock.json;
  // pin the workspace root so Turbopack does not walk up and warn.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Listing photos come from the MLS feed via Cloudinary and board CDNs.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.ampre.ca" },
      { protocol: "https", hostname: "**.realtor.ca" },
      { protocol: "https", hostname: "**.crea.ca" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Pre-con renderings imported from the brokerage WordPress site.
      { protocol: "https", hostname: "estate-4u.com" },
      { protocol: "https", hostname: "**.estate-4u.com" },
    ],
  },
};

export default nextConfig;
