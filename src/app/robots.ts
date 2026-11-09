import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/conta", "/checkout", "/carrinho", "/pedido"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
