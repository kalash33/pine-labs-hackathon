import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose server-side env vars to the SSR runtime via Next.js env config.
  // These are baked in at build time from the Amplify environment variables.
  // This is the correct pattern for Amplify SSR (Next.js) deployments.
  env: {
    PINELABS_CLIENT_ID: process.env.PINELABS_CLIENT_ID ?? "",
    PINELABS_CLIENT_SECRET: process.env.PINELABS_CLIENT_SECRET ?? "",
    PINELABS_BASE_URL: process.env.PINELABS_BASE_URL ?? "https://pluraluat.v2.pinepg.in/api",
    PINELABS_MID: process.env.PINELABS_MID ?? "",
  },
};

export default nextConfig;
