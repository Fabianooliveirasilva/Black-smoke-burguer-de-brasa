import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
/** HTTPS-only directives are emitted only when the public URL is HTTPS (keeps local prod runs working). */
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Crawlers and link-preview bots (WhatsApp matters in Brazil) get <head> metadata before streaming.
  // Do NOT use /.*/ here: treating every request as a bot leaves partial prefetches (`?_rsc=`)
  // hanging, so the network never goes idle (broke the E2E suite in CI on 2026-11-09).
  // Side effect of keeping streaming: Lighthouse/PageSpeed (plain Chrome UA, reads only `head meta`)
  // reports the product page's description as missing (SEO 92); real crawlers get it in <head>.
  htmlLimitedBots:
    /Googlebot|Google-InspectionTool|Mediapartners-Google|AdsBot-Google|bingbot|DuckDuckBot|YandexBot|Applebot|WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot/i,
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/images/**" }, { pathname: "/media/**" }],
    deviceSizes: [390, 640, 828, 1080, 1440, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/videos/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
